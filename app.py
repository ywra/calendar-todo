import streamlit as st
from streamlit_calendar import calendar
from datetime import date, timedelta
import db

# --- 페이지 설정 ---
st.set_page_config(page_title="일정 관리", page_icon="📅", layout="wide")
db.init_db()

# --- 색상 옵션 ---
COLOR_OPTIONS = {
    "파랑": "#3788d8",
    "빨강": "#e74c3c",
    "초록": "#2ecc71",
    "주황": "#f39c12",
    "보라": "#9b59b6",
    "분홍": "#e91e63",
}
COLOR_REVERSE = {v: k for k, v in COLOR_OPTIONS.items()}

# --- 세션 상태 초기화 ---
for key, default in [
    ("form_mode", None),
    ("selected_date", None),
    ("editing_event_id", None),
    ("confirm_delete", False),
    ("form_key", 0),
    ("last_event_click_id", None),
    ("last_date_click", None),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# --- 레이아웃 ---
st.title("📅 일정 관리")
col1, col2 = st.columns([3, 1])

# --- 캘린더 렌더링 ---
with col1:
    events = db.get_events_for_calendar()

    calendar_options = {
        "editable": False,
        "selectable": True,
        "navLinks": True,
        "initialView": "dayGridMonth",
        "headerToolbar": {
            "left": "prev,next today",
            "center": "title",
            "right": "dayGridMonth,dayGridWeek,listMonth",
        },
        "locale": "ko",
        "buttonText": {
            "today": "오늘",
            "month": "월",
            "week": "주",
            "list": "목록",
        },
        "height": 650,
    }

    custom_css = """
        .fc-event { cursor: pointer; border-radius: 4px; padding: 2px 4px; }
        .fc-toolbar-title { font-size: 1.4em !important; }
        .fc-daygrid-day:hover { background-color: #f0f4ff; }
    """

    state = calendar(
        events=events,
        options=calendar_options,
        custom_css=custom_css,
        key="cal",
    )

    # 콜백 처리 (중복 처리 방지)
    if state and state.get("eventClick"):
        clicked_event = state["eventClick"]["event"]
        event_id = int(clicked_event["id"])
        if event_id != st.session_state["last_event_click_id"]:
            st.session_state["last_event_click_id"] = event_id
            st.session_state["last_date_click"] = None
            st.session_state["editing_event_id"] = event_id
            st.session_state["form_mode"] = "edit"
            st.session_state["selected_date"] = None
            st.session_state["confirm_delete"] = False

    elif state and state.get("dateClick"):
        clicked_date = state["dateClick"]["date"][:10]
        if clicked_date != st.session_state["last_date_click"]:
            st.session_state["last_date_click"] = clicked_date
            st.session_state["last_event_click_id"] = None
            st.session_state["selected_date"] = clicked_date
            st.session_state["form_mode"] = "create"
            st.session_state["editing_event_id"] = None
            st.session_state["confirm_delete"] = False
            st.session_state["form_key"] += 1

# --- 사이드 패널 (오른쪽 컬럼) ---
with col2:
    # 새 일정 버튼
    if st.button("➕ 새 일정 추가", use_container_width=True):
        st.session_state["form_mode"] = "create"
        st.session_state["selected_date"] = str(date.today())
        st.session_state["editing_event_id"] = None
        st.session_state["confirm_delete"] = False
        st.session_state["form_key"] += 1
        st.rerun()

    st.divider()

    # === 일정 추가 폼 ===
    if st.session_state["form_mode"] == "create":
        st.subheader("새 일정 추가")

        default_date = date.today()
        if st.session_state["selected_date"]:
            try:
                parts = st.session_state["selected_date"].split("-")
                default_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
            except (ValueError, IndexError):
                pass

        fk = st.session_state["form_key"]
        with st.form(f"create_form_{fk}"):
            title = st.text_input("제목", placeholder="일정 제목을 입력하세요")
            all_day = st.checkbox("종일", value=True)

            c1, c2 = st.columns(2)
            with c1:
                start_date = st.date_input("시작 날짜", value=default_date)
            with c2:
                end_date = st.date_input("종료 날짜", value=default_date)

            if not all_day:
                t1, t2 = st.columns(2)
                with t1:
                    start_time = st.time_input("시작 시간")
                with t2:
                    end_time = st.time_input("종료 시간")
            else:
                start_time = None
                end_time = None

            color_name = st.selectbox("색상", list(COLOR_OPTIONS.keys()))
            description = st.text_area("메모", placeholder="메모를 입력하세요")

            submitted = st.form_submit_button("저장", use_container_width=True)
            if submitted:
                if not title.strip():
                    st.error("제목을 입력해주세요.")
                else:
                    end_d = str(end_date) if end_date != start_date else None
                    # 종일이 아닌 경우 종료 날짜가 없으면 시작 날짜와 동일
                    if not all_day and end_d is None:
                        end_d = str(start_date)
                    db.add_event(
                        title=title.strip(),
                        start_date=str(start_date),
                        end_date=end_d,
                        start_time=start_time.strftime("%H:%M") if start_time else None,
                        end_time=end_time.strftime("%H:%M") if end_time else None,
                        color=COLOR_OPTIONS[color_name],
                        description=description,
                        all_day=all_day,
                    )
                    st.session_state["form_mode"] = None
                    st.session_state["selected_date"] = None
                    st.toast("일정이 추가되었습니다!")
                    st.rerun()

        if st.button("취소", use_container_width=True):
            st.session_state["form_mode"] = None
            st.session_state["selected_date"] = None
            st.rerun()

    # === 일정 수정 폼 ===
    elif st.session_state["form_mode"] == "edit" and st.session_state["editing_event_id"]:
        event = db.get_event(st.session_state["editing_event_id"])
        if event is None:
            st.warning("일정을 찾을 수 없습니다.")
            st.session_state["form_mode"] = None
            st.session_state["editing_event_id"] = None
        else:
            st.subheader("일정 수정")

            # 기존 날짜 파싱
            parts = event["start_date"].split("-")
            ev_start = date(int(parts[0]), int(parts[1]), int(parts[2]))
            if event["end_date"]:
                parts2 = event["end_date"].split("-")
                ev_end = date(int(parts2[0]), int(parts2[1]), int(parts2[2]))
            else:
                ev_end = ev_start

            ev_all_day = bool(event["all_day"])
            ev_color = COLOR_REVERSE.get(event["color"], "파랑")

            with st.form("edit_form"):
                title = st.text_input("제목", value=event["title"])
                all_day = st.checkbox("종일", value=ev_all_day)

                c1, c2 = st.columns(2)
                with c1:
                    start_date = st.date_input("시작 날짜", value=ev_start)
                with c2:
                    end_date = st.date_input("종료 날짜", value=ev_end)

                if not all_day:
                    from datetime import time as dt_time
                    default_st = dt_time(0, 0)
                    default_et = dt_time(0, 0)
                    if event["start_time"]:
                        h, m = event["start_time"].split(":")
                        default_st = dt_time(int(h), int(m))
                    if event["end_time"]:
                        h, m = event["end_time"].split(":")
                        default_et = dt_time(int(h), int(m))

                    t1, t2 = st.columns(2)
                    with t1:
                        start_time = st.time_input("시작 시간", value=default_st)
                    with t2:
                        end_time = st.time_input("종료 시간", value=default_et)
                else:
                    start_time = None
                    end_time = None

                color_name = st.selectbox(
                    "색상",
                    list(COLOR_OPTIONS.keys()),
                    index=list(COLOR_OPTIONS.keys()).index(ev_color)
                    if ev_color in COLOR_OPTIONS else 0,
                )
                description = st.text_area("메모", value=event["description"] or "")

                submitted = st.form_submit_button("수정", use_container_width=True)
                if submitted:
                    if not title.strip():
                        st.error("제목을 입력해주세요.")
                    else:
                        end_d = str(end_date) if end_date != start_date else None
                        if not all_day and end_d is None:
                            end_d = str(start_date)
                        db.update_event(
                            st.session_state["editing_event_id"],
                            title=title.strip(),
                            start_date=str(start_date),
                            end_date=end_d,
                            start_time=start_time.strftime("%H:%M") if start_time else None,
                            end_time=end_time.strftime("%H:%M") if end_time else None,
                            color=COLOR_OPTIONS[color_name],
                            description=description,
                            all_day=int(all_day),
                        )
                        st.session_state["form_mode"] = None
                        st.session_state["editing_event_id"] = None
                        st.session_state["last_event_click_id"] = None
                        st.toast("일정이 수정되었습니다!")
                        st.rerun()

            # 삭제 버튼
            if not st.session_state["confirm_delete"]:
                if st.button("🗑️ 삭제", use_container_width=True, type="secondary"):
                    st.session_state["confirm_delete"] = True
                    st.rerun()
            else:
                st.warning("정말 삭제하시겠습니까?")
                d1, d2 = st.columns(2)
                with d1:
                    if st.button("삭제 확인", use_container_width=True, type="primary"):
                        db.delete_event(st.session_state["editing_event_id"])
                        st.session_state["form_mode"] = None
                        st.session_state["editing_event_id"] = None
                        st.session_state["confirm_delete"] = False
                        st.session_state["last_event_click_id"] = None
                        st.toast("일정이 삭제되었습니다!")
                        st.rerun()
                with d2:
                    if st.button("취소", key="cancel_delete", use_container_width=True):
                        st.session_state["confirm_delete"] = False
                        st.rerun()

            if st.button("닫기", use_container_width=True):
                st.session_state["form_mode"] = None
                st.session_state["editing_event_id"] = None
                st.session_state["last_event_click_id"] = None
                st.rerun()

    # === 기본 상태: 오늘의 일정 목록 ===
    else:
        st.subheader("오늘의 일정")
        today_str = str(date.today())
        all_events = db.get_all_events()
        today_events = [
            e for e in all_events
            if e["start_date"] <= today_str and (e["end_date"] or e["start_date"]) >= today_str
        ]
        if today_events:
            for e in today_events:
                with st.container(border=True):
                    st.markdown(f"**{e['title']}**")
                    if not e["all_day"] and e["start_time"]:
                        time_str = e["start_time"]
                        if e["end_time"]:
                            time_str += f" ~ {e['end_time']}"
                        st.caption(time_str)
                    if e["description"]:
                        st.caption(e["description"])
        else:
            st.info("오늘 등록된 일정이 없습니다.")

        st.divider()
        st.caption(f"전체 일정: {len(all_events)}개")
