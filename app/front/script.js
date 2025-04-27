// --- DOM 요소 가져오기 ---
const promptInput = document.getElementById('prompt-input'); //
const sendButton = document.getElementById('send-button'); //
const chatLog = document.getElementById('chat-log'); //
const chatLogContainer = document.getElementById('chat-log-container'); //
const loadingIndicator = document.getElementById('loading-indicator'); //
const themeToggleButton = document.getElementById('theme-toggle-button'); //
const bodyElement = document.body; //

// --- 테마 관리---
const lightIcon = '☀️'; //
const darkIcon = '🌙'; //

// 테마 설정 함수
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
        if (bodyElement.classList.contains('dark-mode')) { //
            setTheme('light'); // 있으면 라이트 모드로
        } else {
            setTheme('dark'); // 없으면 다크 모드로
        }
    });
} else {
     console.error("테마 버튼 또는 body 요소를 찾을 수 없습니다.");
}


// --- 메시지 추가 및 스크롤 함수 ---
function appendMessage(role, content) {
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
            const rawHtml = marked.parse(content); //
            const sanitizedHtml = DOMPurify.sanitize(rawHtml); //
            messageDiv.innerHTML = sanitizedHtml; //
        }
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


// --- 텍스트 생성 로직 ---
if (sendButton && chatLog && promptInput && chatLogContainer) { // chatLog, chatLogContainer 추가 확인
    sendButton.addEventListener('click', () => { // async 제거 가능 ($.ajax는 콜백/프로미스 기반)
        const prompt = promptInput.value.trim(); //
        if (!prompt) {
            alert('질문을 입력해주세요.'); //
            return;
        }

        // 1. 사용자 메시지를 채팅 로그에 바로 표시
        appendMessage('user', prompt); //
        promptInput.value = ''; // 입력창 비우기
        // promptInput.style.height = 'auto'; // 높이 초기화 (선택적)

        // 로딩 시작
        loadingIndicator.style.display = 'flex'; //
        sendButton.disabled = true; //
        promptInput.disabled = true; //
        scrollToBottom(); // 로딩 표시 후 스크롤

        //$.ajax
        $.ajax({ //
            url: '/generate', //
            type: 'POST', //
            contentType: 'application/json', //
            data: JSON.stringify({ prompt: prompt }), //
            dataType: 'json' //
        })
        .done(function(data) {
            // 2. 모델 응답을 채팅 로그에 추가
            appendMessage('assistant', data.response); //
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
            appendMessage('error', errorMessage); // 오류 역할로 추가
        })
        .always(function() {
            // 로딩 종료
            loadingIndicator.style.display = 'none'; //
            sendButton.disabled = false; //
            promptInput.disabled = false; //
            promptInput.focus(); // 입력창에 다시 포커스
            scrollToBottom(); // 최종 스크롤
        });
    });

     // 입력창에서 Enter 키 입력 시 전송 (Shift+Enter는 줄바꿈)
    promptInput.addEventListener('keydown', (event) => { //
        if (event.key === 'Enter' && !event.shiftKey) { //
            event.preventDefault(); // 기본 Enter 동작(줄바꿈) 막기
            sendButton.click(); // 전송 버튼 클릭 이벤트 실행
        }
    });

} else {
    console.error("필수 HTML 요소(sendButton, chatLog, promptInput, chatLogContainer) 중 일부를 찾을 수 없습니다."); //
}

// --- 페이지 로드 시 초기화 실행 ---
document.addEventListener('DOMContentLoaded', () => { //
    initializeTheme(); // 테마 초기화 함수 호출
});