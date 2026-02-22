"""
Fizikal API Client - לקוח API עבור אפליקציית פיזיקל / הולמס פלייס
=================================================================
משתמש ב-Playwright לאוטומציה של הדפדפן ולחשיפת ה-API הפנימי.
"""

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Browser, Page, Route

logger = logging.getLogger(__name__)

BASE_URL = "https://app.fizikal.co.il"
API_BASE = f"{BASE_URL}/api"
UNIFIED_API = f"{BASE_URL}/api/unified"  # Fisikal Unified API (same pattern as cuttingedge.fisikal.com)


class FizikalAPIError(Exception):
    pass


class FizikalAuthError(FizikalAPIError):
    pass


class FizikalClient:
    """
    לקוח עבור מערכת פיזיקל.
    משתמש ב-Playwright לניהול session וגישה ל-API.
    """

    def __init__(self, config: dict):
        self.config = config
        self.creds = config["credentials"]
        self.adv = config.get("advanced", {})
        self.session_file = Path(self.adv.get("session_file", ".fizikal_session.json"))
        self.headless = self.adv.get("headless", True)
        self.delay = self.adv.get("delay_between_actions", 1.5)
        self.max_retries = self.adv.get("max_retries", 3)

        self._browser: Optional[Browser] = None
        self._page: Optional[Page] = None
        self._playwright = None
        self._session_data: dict = {}
        self._intercepted_apis: dict = {}  # לאגור API calls שנתפסו

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def start(self):
        """הפעל דפדפן"""
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        # טען session קיים אם יש
        if self.session_file.exists():
            try:
                with open(self.session_file) as f:
                    self._session_data = json.load(f)
                logger.info("Session קיים נטען בהצלחה")
            except Exception as e:
                logger.warning(f"לא ניתן לטעון session: {e}")

        context_kwargs = {
            "user_agent": (
                "Mozilla/5.0 (Linux; Android 12; Pixel 6) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Mobile Safari/537.36"
            ),
            "viewport": {"width": 390, "height": 844},
            "locale": "he-IL",
            "timezone_id": "Asia/Jerusalem",
        }

        # שחזר cookies/storage אם קיים
        if self._session_data.get("cookies"):
            context = await self._browser.new_context(**context_kwargs)
            await context.add_cookies(self._session_data["cookies"])
        else:
            context = await self._browser.new_context(**context_kwargs)

        self._page = await context.new_page()

        # האזן לבקשות API לחשיפת endpoints
        await self._setup_api_interceptor()

    async def close(self):
        """סגור דפדפן ושמור session (כולל fisikal_token)"""
        if self._page:
            try:
                cookies = await self._page.context.cookies()
                self._session_data["cookies"] = cookies
            except Exception as e:
                logger.warning(f"שגיאה בשמירת cookies: {e}")

        try:
            with open(self.session_file, "w") as f:
                json.dump(self._session_data, f, ensure_ascii=False, indent=2)
            logger.info("Session נשמר")
        except Exception as e:
            logger.warning(f"שגיאה בשמירת session: {e}")

        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def _setup_api_interceptor(self):
        """הגדר האזנה לבקשות API לאגור endpoints ו-tokens"""

        async def handle_request(route: Route):
            request = route.request
            url = request.url

            # אגור בקשות API
            if "/api/" in url or "fizikal" in url:
                headers = dict(request.headers)
                # שמור token אם קיים
                for h in ["authorization", "x-token", "x-auth-token", "token"]:
                    if h in headers:
                        self._session_data["auth_token"] = headers[h]
                        logger.debug(f"Token נתפס: {h} = {headers[h][:20]}...")

                logger.debug(f"API Request: {request.method} {url}")

            await route.continue_()

        async def handle_response(response):
            url = response.url
            if "/api/" in url or ("fizikal" in url and response.status == 200):
                try:
                    content_type = response.headers.get("content-type", "")
                    if "json" in content_type:
                        body = await response.json()
                        # שמור token מתשובות
                        if isinstance(body, dict):
                            for key in ["token", "accessToken", "TokenID", "auth_token"]:
                                if key in body:
                                    self._session_data["auth_token"] = body[key]
                                    logger.info(f"Auth token נמצא ב-response: {key}")
                        self._intercepted_apis[url] = {
                            "status": response.status,
                            "body_preview": str(body)[:200],
                        }
                except Exception:
                    pass

        self._page.on("response", handle_response)
        await self._page.route("**/*", handle_request)

    async def _wait(self, seconds: float = None):
        await asyncio.sleep(seconds or self.delay)

    # ─── Authentication ────────────────────────────────────────────────────

    async def login(self) -> bool:
        """
        כניסה למערכת פיזיקל.
        שיטות (לפי סדר עדיפות):
        1. Unified API ישיר עם אימייל + סיסמה (מהיר, ללא דפדפן)
        2. אימות דרך מספר טלפון + OTP (דרך דפדפן)
        3. אימות דרך אימייל + סיסמה (דרך ממשק דפדפן)
        """
        # בדוק אם session עדיין תקף
        if self._session_data.get("fisikal_token") or self._session_data.get("auth_token"):
            logger.info("Token קיים - ממשיך ללא כניסה מחדש")
            return True

        phone = self.creds.get("phone", "").strip()
        email = self.creds.get("email", "").strip()
        password = self.creds.get("password", "").strip()

        # נסה Unified API קודם (מהיר יותר - ללא דפדפן)
        if email and password:
            if await self._login_via_unified_api(email, password):
                return True

        # נפול חזרה לאוטומציה של דפדפן
        logger.info(f"עובר לכניסה דרך דפדפן: {BASE_URL}...")
        await self._page.goto(BASE_URL, wait_until="networkidle")
        await self._wait(2)

        if phone:
            return await self._login_phone(phone)
        elif email and password:
            return await self._login_email(email, password)
        else:
            raise FizikalAuthError("לא הוגדרו פרטי כניסה ב-config.yaml")

    async def _login_via_unified_api(self, email: str, password: str) -> bool:
        """
        כניסה ישירה דרך Fisikal Unified API.
        POST /api/unified/oauth/token עם strategy=email_password.
        מחזיר fisikal_token בהצלחה.
        """
        import httpx

        endpoint = f"{UNIFIED_API}/oauth/token"
        payload = {
            "strategy": "email_password",
            "email": email,
            "password": password,
        }
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": BASE_URL,
            "Referer": BASE_URL,
            "User-Agent": (
                "Mozilla/5.0 (Linux; Android 12; Pixel 6) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Mobile Safari/537.36"
            ),
        }

        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                resp = await client.post(endpoint, json=payload, headers=headers, timeout=15)
                logger.debug(f"Unified API auth response: {resp.status_code}")

                if resp.status_code in (200, 201):
                    data = resp.json()
                    # Unified API מחזיר fisikal_token
                    token = (
                        data.get("fisikal_token")
                        or data.get("token")
                        or data.get("accessToken")
                        or data.get("access_token")
                    )
                    if token:
                        self._session_data["fisikal_token"] = token
                        self._session_data["auth_token"] = token
                        logger.info("כניסה דרך Unified API הצליחה")
                        logger.debug(f"Token: {token[:20]}...")
                        return True
                    else:
                        logger.debug(f"Unified API: אין token בתגובה: {list(data.keys())}")
                else:
                    logger.debug(f"Unified API auth נכשל: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            logger.debug(f"Unified API auth exception: {e}")

        return False

    async def _check_session(self) -> bool:
        """בדוק אם ה-session הקיים עדיין תקף"""
        if not self._session_data.get("cookies"):
            return False
        try:
            await self._page.goto(f"{BASE_URL}/schedule", wait_until="networkidle", timeout=15000)
            await self._wait(1)
            url = self._page.url
            # אם לא הופנינו לדף login - session תקף
            return "login" not in url and "auth" not in url
        except Exception:
            return False

    async def _login_phone(self, phone: str) -> bool:
        """כניסה עם מספר טלפון + OTP"""
        logger.info(f"כניסה עם טלפון: {phone}")

        # חפש שדה טלפון בדף
        selectors = [
            'input[type="tel"]',
            'input[name="phone"]',
            'input[placeholder*="טלפון"]',
            'input[placeholder*="phone"]',
            'input[placeholder*="נייד"]',
        ]

        phone_input = None
        for sel in selectors:
            try:
                elem = self._page.locator(sel)
                if await elem.count() > 0:
                    phone_input = elem.first
                    break
            except Exception:
                continue

        if not phone_input:
            # נסה למצוא דרך aria-label
            phone_input = self._page.get_by_role("textbox").first

        if not phone_input:
            raise FizikalAuthError("לא נמצא שדה טלפון בדף הכניסה")

        await phone_input.click()
        await phone_input.fill(phone)
        await self._wait(0.5)

        # לחץ שלח
        submit_selectors = [
            'button[type="submit"]',
            'button:has-text("שלח")',
            'button:has-text("כניסה")',
            'button:has-text("המשך")',
            'button:has-text("Send")',
            'button:has-text("Login")',
        ]
        for sel in submit_selectors:
            try:
                btn = self._page.locator(sel)
                if await btn.count() > 0:
                    await btn.first.click()
                    break
            except Exception:
                continue

        await self._wait(2)

        # אם הופיע שדה OTP
        otp_selectors = [
            'input[type="number"]',
            'input[name="otp"]',
            'input[name="code"]',
            'input[placeholder*="קוד"]',
            'input[placeholder*="code"]',
            'input[placeholder*="OTP"]',
            'input[autocomplete="one-time-code"]',
        ]

        otp_input = None
        for sel in otp_selectors:
            try:
                elem = self._page.locator(sel)
                if await elem.count() > 0:
                    otp_input = elem.first
                    break
            except Exception:
                continue

        if otp_input:
            logger.info("נשלח קוד OTP - ממתין לקוד...")
            # המתן לקלט מהמשתמש
            otp_code = await self._get_otp_from_user()
            await otp_input.fill(otp_code)
            await self._wait(0.5)

            # שלח קוד OTP
            for sel in submit_selectors:
                try:
                    btn = self._page.locator(sel)
                    if await btn.count() > 0:
                        await btn.first.click()
                        break
                except Exception:
                    continue

            await self._wait(3)

        # בדוק הצלחה
        current_url = self._page.url
        if "login" in current_url or "auth" in current_url:
            raise FizikalAuthError("הכניסה נכשלה - בדוק את פרטי ההתחברות")

        logger.info("כניסה בוצעה בהצלחה!")
        return True

    async def _login_email(self, email: str, password: str) -> bool:
        """כניסה עם אימייל + סיסמה"""
        logger.info(f"כניסה עם אימייל: {email}")

        email_selectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="אימייל"]',
            'input[placeholder*="email"]',
        ]

        email_input = None
        for sel in email_selectors:
            try:
                elem = self._page.locator(sel)
                if await elem.count() > 0:
                    email_input = elem.first
                    break
            except Exception:
                continue

        if not email_input:
            raise FizikalAuthError("לא נמצא שדה אימייל")

        await email_input.fill(email)
        await self._wait(0.3)

        password_input = self._page.locator('input[type="password"]')
        if await password_input.count() > 0:
            await password_input.first.fill(password)
            await self._wait(0.3)

        submit = self._page.locator('button[type="submit"]')
        if await submit.count() > 0:
            await submit.first.click()

        await self._wait(3)

        current_url = self._page.url
        if "login" in current_url or "auth" in current_url:
            raise FizikalAuthError("הכניסה נכשלה - בדוק אימייל/סיסמה")

        logger.info("כניסה בוצעה בהצלחה!")
        return True

    async def _get_otp_from_user(self) -> str:
        """קבל OTP ממשתמש - בהרצה אוטומטית נשלח SMS למשתמש"""
        import sys

        if sys.stdin.isatty():
            # מצב אינטראקטיבי - בקש קלט
            return input("הכנס את קוד ה-OTP שנשלח אליך: ").strip()
        else:
            # מצב אוטומטי (cron) - המתן לקובץ OTP
            otp_file = Path(".otp_code")
            logger.info("ממתין לקוד OTP בקובץ .otp_code ...")
            for _ in range(60):  # המתן עד דקה
                if otp_file.exists():
                    code = otp_file.read_text().strip()
                    otp_file.unlink()
                    return code
                await asyncio.sleep(5)
            raise FizikalAuthError("לא התקבל קוד OTP בזמן")

    # ─── Schedule ──────────────────────────────────────────────────────────

    async def get_schedule(self, target_date: str = None) -> list[dict]:
        """
        משוך את לוח החוגים.
        target_date: תאריך בפורמט YYYY-MM-DD (ברירת מחדל: מחר)
        מחזיר: רשימת חוגים עם פרטים
        """
        from datetime import date, timedelta

        if not target_date:
            tomorrow = date.today() + timedelta(days=1)
            target_date = tomorrow.strftime("%Y-%m-%d")

        logger.info(f"טוען לוח חוגים לתאריך: {target_date}")

        # נסה ניווט ישיר לדף לוח הזמנים
        schedule_urls = [
            f"{BASE_URL}/schedule/{target_date}",
            f"{BASE_URL}/schedule",
            f"{BASE_URL}/classes",
            f"{BASE_URL}/timetable",
        ]

        classes = []
        for url in schedule_urls:
            try:
                response = await self._page.goto(url, wait_until="networkidle", timeout=15000)
                if response and response.status == 200:
                    await self._wait(2)
                    classes = await self._extract_classes_from_page(target_date)
                    if classes:
                        logger.info(f"נמצאו {len(classes)} חוגים")
                        return classes
            except Exception as e:
                logger.debug(f"נסיון {url} נכשל: {e}")
                continue

        # אם לא הצלחנו, נסה דרך API ישיר
        classes = await self._get_schedule_via_api(target_date)
        return classes

    async def _get_schedule_via_api(self, target_date: str) -> list[dict]:
        """ניסיון לגשת ל-API ישירות - כולל Unified API endpoints"""
        import httpx

        token = self._session_data.get("fisikal_token") or self._session_data.get("auth_token", "")
        cookies = {c["name"]: c["value"] for c in self._session_data.get("cookies", [])}

        # Unified API endpoints (לפי תיעוד Fisikal) + fallbacks
        api_endpoints = [
            f"{UNIFIED_API}/lesson_sessions?date={target_date}",
            f"{UNIFIED_API}/lessons?date={target_date}",
            f"{UNIFIED_API}/schedule?date={target_date}",
            f"{API_BASE}/schedule?date={target_date}",
            f"{API_BASE}/classes?date={target_date}",
            f"{API_BASE}/lessons?date={target_date}",
            f"{API_BASE}/timetable?date={target_date}",
        ]

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Referer": BASE_URL,
            "Origin": BASE_URL,
        }
        if token:
            headers["X-Fisikal-Token"] = token
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient(cookies=cookies, follow_redirects=True) as client:
            for endpoint in api_endpoints:
                try:
                    resp = await client.get(endpoint, headers=headers, timeout=10)
                    if resp.status_code == 200:
                        data = resp.json()
                        parsed = self._parse_api_schedule(data)
                        if parsed:
                            logger.info(f"API הצליח: {endpoint} - {len(parsed)} חוגים")
                            return parsed
                except Exception as e:
                    logger.debug(f"API {endpoint} נכשל: {e}")

        return []

    async def _extract_classes_from_page(self, target_date: str) -> list[dict]:
        """חלץ מידע על חוגים מה-HTML של הדף"""
        classes = []

        # נסה לזהות כרטיסי חוגים בדף
        class_selectors = [
            '[class*="class-item"]',
            '[class*="lesson"]',
            '[class*="session"]',
            '[class*="event"]',
            '[data-type="class"]',
            ".class-card",
            ".lesson-card",
            ".event-item",
            "li[class*='class']",
        ]

        for selector in class_selectors:
            elements = self._page.locator(selector)
            count = await elements.count()
            if count > 0:
                logger.info(f"נמצאו {count} כרטיסי חוגים עם selector: {selector}")
                for i in range(count):
                    el = elements.nth(i)
                    class_info = await self._extract_class_info(el, target_date)
                    if class_info:
                        classes.append(class_info)
                break

        # אם לא נמצא, נסה לקרוא JSON מהדף
        if not classes:
            classes = await self._extract_json_from_page(target_date)

        return classes

    async def _extract_class_info(self, element, target_date: str) -> Optional[dict]:
        """חלץ מידע על חוג אחד מאלמנט HTML"""
        try:
            text = await element.inner_text()
            html = await element.inner_html()

            # חפש שם חוג
            name = ""
            name_selectors = [
                "h3", "h4", ".name", ".title", '[class*="name"]', '[class*="title"]'
            ]
            for ns in name_selectors:
                try:
                    name_el = element.locator(ns)
                    if await name_el.count() > 0:
                        name = (await name_el.first.inner_text()).strip()
                        break
                except Exception:
                    pass

            if not name:
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                name = lines[0] if lines else ""

            # חפש שעה
            time_match = re.search(r"\d{1,2}:\d{2}", text)
            start_time = time_match.group() if time_match else ""

            # חפש כפתור הרשמה
            book_btn = element.locator('button, a').first
            is_bookable = await book_btn.count() > 0

            # חפש data attributes
            class_id = await element.get_attribute("data-id") or \
                       await element.get_attribute("data-class-id") or \
                       await element.get_attribute("id") or ""

            return {
                "id": class_id,
                "name": name,
                "date": target_date,
                "start_time": start_time,
                "instructor": "",
                "is_bookable": is_bookable,
                "element_html": html[:500],
            }
        except Exception as e:
            logger.debug(f"שגיאה בחילוץ מידע על חוג: {e}")
            return None

    async def _extract_json_from_page(self, target_date: str) -> list[dict]:
        """חלץ JSON מה-JavaScript state של הדף"""
        try:
            # נסה לחלץ Next.js/React state
            data = await self._page.evaluate("""
                () => {
                    // נסה Next.js
                    const nextData = window.__NEXT_DATA__;
                    if (nextData) return JSON.stringify(nextData);

                    // נסה Nuxt
                    const nuxtData = window.__NUXT__;
                    if (nuxtData) return JSON.stringify(nuxtData);

                    // חפש כל משתנה שמכיל classes/lessons
                    for (const key of Object.keys(window)) {
                        if (key.toLowerCase().includes('class') ||
                            key.toLowerCase().includes('lesson') ||
                            key.toLowerCase().includes('schedule')) {
                            try {
                                const val = window[key];
                                if (Array.isArray(val) && val.length > 0) {
                                    return JSON.stringify(val);
                                }
                            } catch(e) {}
                        }
                    }
                    return null;
                }
            """)
            if data:
                parsed = json.loads(data)
                return self._parse_api_schedule(parsed)
        except Exception as e:
            logger.debug(f"לא ניתן לחלץ JSON מהדף: {e}")
        return []

    def _parse_api_schedule(self, data: Any) -> list[dict]:
        """המר תגובת API לרשימת חוגים מנורמלת"""
        classes = []
        if not data:
            return classes

        # תמיכה במבנים שונים
        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            for key in ["classes", "lessons", "sessions", "events", "data", "items", "results"]:
                if key in data:
                    val = data[key]
                    if isinstance(val, list):
                        items = val
                        break
            if not items and "props" in data:
                # Next.js structure
                try:
                    items = (
                        data["props"].get("pageProps", {})
                             .get("schedule", [])
                    )
                except Exception:
                    pass

        for item in items:
            if not isinstance(item, dict):
                continue
            classes.append({
                "id": str(
                    item.get("id") or item.get("lessonId") or item.get("classId") or ""
                ),
                "name": (
                    item.get("name") or item.get("title") or item.get("className") or ""
                ),
                "date": (
                    item.get("date") or item.get("lessonDate") or item.get("day") or ""
                ),
                "start_time": (
                    item.get("startTime") or item.get("start_time") or
                    item.get("time") or item.get("hour") or ""
                ),
                "end_time": (
                    item.get("endTime") or item.get("end_time") or ""
                ),
                "instructor": (
                    item.get("instructor") or item.get("trainer") or
                    item.get("teacher") or item.get("instructorName") or ""
                ),
                "is_bookable": (
                    item.get("isBookable") or item.get("canBook") or
                    item.get("available") or item.get("status") == "open" or False
                ),
                "spots_left": (
                    item.get("spotsLeft") or item.get("availableSpots") or
                    item.get("freeSlots") or None
                ),
                "raw": item,
            })

        return classes

    # ─── Booking ───────────────────────────────────────────────────────────

    async def book_class(self, class_info: dict) -> bool:
        """
        הרשם לחוג.
        class_info: מידע על החוג (מ-get_schedule)
        מחזיר: True אם ההרשמה הצליחה
        """
        class_id = class_info.get("id", "")
        class_name = class_info.get("name", "לא ידוע")
        start_time = class_info.get("start_time", "")

        logger.info(f"מנסה להירשם ל: {class_name} ({start_time}) - ID: {class_id}")

        # נסה API ישיר קודם
        if class_id:
            success = await self._book_via_api(class_id)
            if success:
                return True

        # נסה דרך ממשק דפדפן
        return await self._book_via_browser(class_info)

    async def _book_via_api(self, class_id: str) -> bool:
        """נסה הרשמה דרך API ישיר - כולל Unified API endpoints"""
        import httpx

        token = self._session_data.get("fisikal_token") or self._session_data.get("auth_token", "")
        cookies = {c["name"]: c["value"] for c in self._session_data.get("cookies", [])}

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Referer": BASE_URL,
            "Origin": BASE_URL,
        }
        if token:
            headers["X-Fisikal-Token"] = token
            headers["Authorization"] = f"Bearer {token}"

        # Unified API booking endpoints (לפי תיעוד Fisikal) + fallbacks
        book_endpoints = [
            (f"{UNIFIED_API}/lesson_sessions/{class_id}/book", {}),
            (f"{UNIFIED_API}/lesson_sessions/{class_id}/register", {}),
            (f"{UNIFIED_API}/bookings", {"lesson_session_id": class_id}),
            (f"{API_BASE}/book", {"classId": class_id}),
            (f"{API_BASE}/classes/{class_id}/book", {}),
            (f"{API_BASE}/lessons/{class_id}/register", {}),
            (f"{API_BASE}/schedule/{class_id}/book", {}),
            (f"{API_BASE}/registration", {"lessonId": class_id}),
        ]

        async with httpx.AsyncClient(cookies=cookies, follow_redirects=True) as client:
            for endpoint, payload in book_endpoints:
                try:
                    resp = await client.post(
                        endpoint, json=payload, headers=headers, timeout=10
                    )
                    if resp.status_code in (200, 201):
                        data = resp.json()
                        if self._is_booking_success(data):
                            logger.info(f"הרשמה הצליחה דרך API: {endpoint}")
                            return True
                except Exception as e:
                    logger.debug(f"API booking {endpoint} נכשל: {e}")

        return False

    def _is_booking_success(self, data: Any) -> bool:
        """בדוק אם תגובת API מעידה על הצלחה"""
        if not isinstance(data, dict):
            return False
        success_keys = ["success", "booked", "registered", "confirmed"]
        for key in success_keys:
            if data.get(key) is True:
                return True
        if data.get("status") in ("ok", "success", "booked", "confirmed"):
            return True
        return False

    async def _book_via_browser(self, class_info: dict) -> bool:
        """הרשמה דרך ממשק הדפדפן"""
        class_name = class_info.get("name", "")
        start_time = class_info.get("start_time", "")

        # נווט לדף לוח הזמנים אם לא שם
        current_url = self._page.url
        if "schedule" not in current_url and "classes" not in current_url:
            await self._page.goto(f"{BASE_URL}/schedule", wait_until="networkidle")
            await self._wait(2)

        # מצא את כרטיס החוג
        class_card = await self._find_class_card(class_name, start_time)
        if not class_card:
            logger.warning(f"לא נמצא כרטיס לחוג: {class_name} בשעה {start_time}")
            return False

        # מצא כפתור הרשמה
        book_btn_selectors = [
            'button:has-text("הירשם")',
            'button:has-text("הרשם")',
            'button:has-text("רישום")',
            'button:has-text("Book")',
            'button:has-text("Register")',
            'a:has-text("הירשם")',
            'button[class*="book"]',
            'button[class*="register"]',
        ]

        for sel in book_btn_selectors:
            try:
                btn = class_card.locator(sel)
                if await btn.count() > 0:
                    await btn.first.click()
                    await self._wait(2)

                    # בדוק אישור
                    if await self._confirm_booking():
                        logger.info(f"הרשמה בוצעה: {class_name}")
                        return True
            except Exception as e:
                logger.debug(f"שגיאה בלחיצה על {sel}: {e}")

        # נסה לחיצה על כל כפתור בכרטיס
        try:
            btn = class_card.locator("button").first
            if await btn.count() > 0:
                await btn.click()
                await self._wait(2)
                if await self._confirm_booking():
                    return True
        except Exception:
            pass

        logger.warning(f"לא הצלחנו להירשם ל: {class_name}")
        return False

    async def _find_class_card(self, class_name: str, start_time: str):
        """מצא כרטיס חוג ספציפי בדף"""
        # חפש לפי שם החוג
        locators = [
            self._page.locator(f'text="{class_name}"').first,
            self._page.get_by_text(class_name, exact=False).first,
        ]

        for loc in locators:
            try:
                if await loc.count() > 0:
                    # מצא את הכרטיס המכיל (ancestor)
                    card = loc.locator("..").locator("..").locator("..")
                    text = await card.inner_text()
                    if start_time in text or not start_time:
                        return card
            except Exception:
                continue

        return None

    async def _confirm_booking(self) -> bool:
        """אשר הרשמה אם נדרש (popup/dialog)"""
        # בדוק אם יש dialog אישור
        confirm_selectors = [
            'button:has-text("אשר")',
            'button:has-text("כן")',
            'button:has-text("Confirm")',
            'button:has-text("Yes")',
            'button:has-text("אוקיי")',
            'button:has-text("OK")',
        ]
        for sel in confirm_selectors:
            try:
                btn = self._page.locator(sel)
                if await btn.count() > 0:
                    await btn.first.click()
                    await self._wait(1)
            except Exception:
                pass

        # בדוק הודעת הצלחה
        success_texts = [
            "נרשמת", "הרישום בוצע", "הצלחה", "נרשמת בהצלחה",
            "booked", "registered", "success", "confirmed"
        ]
        try:
            page_text = await self._page.inner_text("body")
            for t in success_texts:
                if t.lower() in page_text.lower():
                    return True
        except Exception:
            pass

        return False

    # ─── Utilities ────────────────────────────────────────────────────────

    async def take_screenshot(self, filename: str = "debug_screenshot.png"):
        """צלם screenshot לדיבאג"""
        if self._page:
            await self._page.screenshot(path=filename, full_page=True)
            logger.info(f"Screenshot נשמר: {filename}")

    def get_intercepted_apis(self) -> dict:
        """החזר API calls שנתפסו (לדיבאג/פיתוח)"""
        return self._intercepted_apis
