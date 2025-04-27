// --- DOM 요소 가져오기 ---
const promptInput = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const chatLog = document.getElementById('chat-log');
const chatLogContainer = document.getElementById('chat-log-container');
const loadingIndicator = document.getElementById('loading-indicator');
const themeToggleButton = document.getElementById('theme-toggle-button');
const bodyElement = document.body;

// --- 테마 관리 ---
const lightIcon = '☀️';
const darkIcon = '🌙';

// 테마 설정 함수 (CSS 클래스 이름 'dark-mode' 사용)
function setTheme(theme) {
    if (theme === 'dark') {
        bodyElement.classList.add('dark-mode'); // 'dark-mode' 클래스 추가
        themeToggleButton.textContent = lightIcon; // 다크 모드일 때는 라이트 모드 전환 아이콘
        localStorage.setItem('theme', 'dark');
    } else {
        bodyElement.classList.remove('dark-mode'); // 'dark-mode' 클래스 제거
        themeToggleButton.textContent = darkIcon; // 라이트 모드일 때는 다크 모드 전환 아이콘
        localStorage.setItem('theme', 'light');
    }
}

// 테마 초기화 함수
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 저장된 테마가 있으면 우선 적용, 없으면 시스템 설정 확인, 그것도 없으면 기본 라이트 모드
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (prefersDark) {
        setTheme('dark');
    } else {
        setTheme('light'); // 기본값 라이트
    }
}

// 테마 토글 버튼 이벤트 리스너
if (themeToggleButton && bodyElement) { // themeToggleButton, bodyElement null 체크
    themeToggleButton.addEventListener('click', () => {
        // 현재 body에 'dark-mode' 클래스가 있는지 확인
        if (bodyElement.classList.contains('dark-mode')) {
            setTheme('light'); // 있으면 라이트 모드로
        } else {
            setTheme('dark'); // 없으면 다크 모드로
        }
    });
} else {
     console.error("테마 버튼 또는 body 요소를 찾을 수 없습니다.");
}


// --- 메시지 추가 및 스크롤 함수 (시간 표시 기능 추가) ---
function appendMessage(role, content, duration = null) { // duration 파라미터 추가
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`); // 공통 클래스 및 역할별 클래스

    if (role === 'user') {
        messageDiv.textContent = content; // 사용자 메시지는 텍스트 그대로
    } else if (role === 'assistant') {
        // 모델 응답은 마크다운 렌더링 및 소독
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') { //
            console.error("Markdown/DOMPurify 라이브러리가 로드되지 않았습니다."); //
            messageDiv.innerHTML = '<p style="color: orange;">오류: 렌더링 라이브러리 로딩 실패</p>'; //
        } else {
            try { // 마크다운 렌더링 오류 방지
                const rawHtml = marked.parse(content); //
                const sanitizedHtml = DOMPurify.sanitize(rawHtml); //
                messageDiv.innerHTML = sanitizedHtml; //
            } catch (error) {
                console.error("Markdown parsing/sanitizing error:", error);
                // 오류 발생 시 원본 텍스트라도 표시
                messageDiv.textContent = content;
                messageDiv.innerHTML += '<p style="color: orange;"> (마크다운 렌더링 오류)</p>';
            }
        }

        // --- 소요 시간 표시 추가 ---
        if (duration !== null && duration !== undefined) {
            const durationSpan = document.createElement('span');
            durationSpan.classList.add('response-duration'); // 스타일링 위한 클래스 추가
            durationSpan.textContent = ` (${duration}초)`;

            // 생성된 span을 메시지 div 내부의 적절한 위치에 추가
            // 예: 마지막 문단(<p>) 뒤에 추가 (내용이 없거나 p가 아닐 수도 있으므로 확인)
            const lastChild = messageDiv.lastElementChild;
            if (lastChild && lastChild.tagName === 'P') {
                 // 마지막 p 태그 내용 뒤에 이어서 표시 (innerHTML 사용 주의)
                 lastChild.innerHTML += ` <span class="response-duration">(${duration}초)</span>`;
            } else {
                 // 적절한 위치 못 찾으면 그냥 div 끝에 추가
                 messageDiv.appendChild(durationSpan);
            }
        }
        // --- 소요 시간 표시 끝 ---

    } else if (role === 'error') {
        // 오류 메시지 스타일링 (textContent 사용 권장)
        messageDiv.textContent = content; //
         messageDiv.style.color = 'red'; // 간단 스타일링
    }

    chatLog.appendChild(messageDiv); // 채팅 로그에 메시지 추가

    // 스크롤을 맨 아래로 이동
    scrollToBottom();
}

// 스크롤을 아래로 내리는 함수
function scrollToBottom() {
    // chatLogContainer가 있을 경우에만 실행
    if (chatLogContainer) { //
         // 약간의 시간차를 두어 DOM 업데이트 후 스크롤 실행 (필요시)
        setTimeout(() => {
            chatLogContainer.scrollTop = chatLogContainer.scrollHeight; //
        }, 0);
    }
}


// --- 텍스트 생성 로직 (시간 표시 연동) ---
if (sendButton && chatLog && promptInput && chatLogContainer) { //
    sendButton.addEventListener('click', () => { //
        const prompt = promptInput.value.trim(); //
        if (!prompt) {
            alert('질문을 입력해주세요.'); //
            return;
        }

        // 1. 사용자 메시지를 채팅 로그에 바로 표시
        appendMessage('user', prompt); //
        promptInput.value = ''; // 입력창 비우기

        // 로딩 시작
        loadingIndicator.style.display = 'flex'; //
        sendButton.disabled = true; //
        promptInput.disabled = true; //
        scrollToBottom(); // 로딩 표시 후 스크롤

        // --- $.ajax 사용 (시간 표시 연동) ---
        $.ajax({ //
            url: '/generate', //
            type: 'POST', //
            contentType: 'application/json', //
            data: JSON.stringify({ prompt: prompt }), //
            dataType: 'json' //
        })
        .done(function(data) {
            // 2. 모델 응답과 시간을 채팅 로그에 추가
            // data.duration 값이 있는지 확인 후 전달
            appendMessage('assistant', data.response, data.duration); // 수정: data.duration 전달
        })
        .fail(function(jqXHR, textStatus, errorThrown) { //
            console.error('AJAX Error:', textStatus, errorThrown, jqXHR.responseText); //
            let errorMessage = `오류 발생: ${textStatus || '알 수 없는 오류'}`; //
            try {
                const errorData = JSON.parse(jqXHR.responseText); //
                if (errorData && errorData.detail) { errorMessage = `오류 발생: ${errorData.detail}`; } //
            } catch (e) { //
                 if(jqXHR.responseText){ errorMessage = `서버 오류 (${jqXHR.status || textStatus}): ${jqXHR.responseText}`; } //
            }
            // 3. 오류 메시지를 채팅 로그에 추가
            appendMessage('error', errorMessage); //
        })
        .always(function() {
            // 로딩 종료
            loadingIndicator.style.display = 'none'; //
            sendButton.disabled = false; //
            promptInput.disabled = false; //
            promptInput.focus(); // 입력창에 다시 포커스
            scrollToBottom(); // 최종 스크롤
        });
        // --- $.ajax 끝 ---

    });

     // 입력창에서 Enter 키 입력 시 전송 (Shift+Enter는 줄바꿈)
    promptInput.addEventListener('keydown', (event) => { //
        if (event.key === 'Enter' && !event.shiftKey) { //
            event.preventDefault(); // 기본 Enter 동작(줄바꿈) 막기
            sendButton.click(); // 전송 버튼 클릭 이벤트 실행
        }
    });

    // 입력창 내용에 따라 높이 자동 조절 (선택적)
    // promptInput.addEventListener('input', () => {
    //     promptInput.style.height = 'auto';
    //     promptInput.style.height = (promptInput.scrollHeight) + 'px';
    // });


} else {
    console.error("필수 HTML 요소(sendButton, chatLog, promptInput, chatLogContainer) 중 일부를 찾을 수 없습니다."); //
}

// --- 페이지 로드 시 초기화 실행 ---
document.addEventListener('DOMContentLoaded', () => { //
    initializeTheme(); // 테마 초기화 함수 호출
    // 페이지 로드 시 초기 스크롤 (필요하다면)
    // scrollToBottom();
});