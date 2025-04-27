import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from llama_cpp import Llama
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)  # INFO 레벨 이상 로그 출력
# logging.basicConfig(level=logging.DEBUG) # 디버깅 시 DEBUG 레벨 사용 가능
logger = logging.getLogger(__name__)

# --- 모델 로드 (애플리케이션 시작 시 한 번만) ---
MODEL_PATH = "./google/googlegemma-3-4b-it-qat-q4_0-gguf/gemma-3-4b-it-q4_0.gguf"
llm = None

try:
    logger.info(f"모델 로딩 시작: {MODEL_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {MODEL_PATH}")

    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=64000,  # 컨텍스트 길이 (필요 시 조절)
        n_threads=6,  # CPU 스레드 수
        n_gpu_layers=-1,  # GPU 오프로딩 레이어 수 (가능한 최대로 시도, 오류 시 조절)
        n_batch=512,  # 배치 크기
        verbose=True  # llama.cpp 상세 로그 출력 여부
    )
    logger.info("모델 로딩 성공!")
except Exception as e:
    logger.error(f"모델 로딩 중 오류 발생: {e}", exc_info=True)
    # 모델 로딩 실패 시 에러를 명확히 알림
    # 실제 서비스에서는 모델 로딩 실패 시 서버 실행을 중단하는 것이 좋을 수 있습니다.
    # raise RuntimeError(f"모델 로딩 실패: {e}")

# --- 대화 내역 저장소 ---
# 간단한 데모용 인-메모리 저장소. 서버 재시작 시 초기화됨.
conversation_history = []

# --- FastAPI 앱 설정 ---
app = FastAPI()

# 정적 파일 경로 설정 ("/static" 경로로 app/front 안의 파일들을 제공)
app.mount("/static", StaticFiles(directory="app/front"), name="static")


# 요청 Body 모델 정의
class PromptRequest(BaseModel):
    prompt: str


# --- 프롬프트 포맷팅 함수 ---
def format_prompt_with_history(history: list, current_prompt: str, max_history_turns: int = 5) -> str:
    """
    대화 내역과 현재 프롬프트를 Gemma Instruct 형식으로 포맷합니다.
    최근 N개의 대화 턴만 사용합니다.
    """
    formatted_prompt = ""

    # 포함할 대화 턴 수 계산 (user + assistant = 1턴)
    # max_history_turns 만큼의 턴 = 2 * max_history_turns 개의 메시지
    start_index = max(0, len(history) - (2 * max_history_turns))

    # 선택된 대화 내역 포맷팅
    for msg in history[start_index:]:
        role = msg.get("role")
        content = msg.get("content")
        if role and content:
            # Gemma Instruct 형식 적용
            formatted_prompt += f"<start_of_turn>{role}\n{content}<end_of_turn>\n"

    # 현재 사용자 프롬프트 추가 - 이 부분은 /generate 에서 history에 추가 후 포맷하므로 제거
    # formatted_prompt += f"<start_of_turn>user\n{current_prompt}<end_of_turn>\n"

    # 모델이 응답을 시작하도록 마지막 토큰 추가
    formatted_prompt += "<start_of_turn>model\n"  # 모델 응답 시작 부분

    logger.debug(f"Formatted Prompt (without current prompt):\n{formatted_prompt}")  # 디버깅용 로그
    return formatted_prompt


# --- 라우트 (Endpoints) ---

@app.get("/", response_class=HTMLResponse)
async def read_root():
    # 기본 HTML 페이지 제공
    html_file_path = "app/front/index.html"
    if not os.path.exists(html_file_path):
        raise HTTPException(status_code=404, detail="index.html 파일을 찾을 수 없습니다.")
    return FileResponse(html_file_path)


@app.post("/generate")
async def generate_text(request: PromptRequest):
    global conversation_history  # 전역 변수 사용 명시

    if llm is None:
        logger.error("모델이 로드되지 않았습니다. 요청을 처리할 수 없습니다.")
        raise HTTPException(status_code=503, detail="모델 로딩 오류로 인해 서비스를 사용할 수 없습니다.")

    prompt = request.prompt
    logger.info(f"수신된 프롬프트: {prompt}")

    # 1. 현재 프롬프트를 대화 내역에 추가 ('user' 역할)
    current_user_message = {"role": "user", "content": prompt}
    conversation_history.append(current_user_message)

    # 2. 대화 내역을 모델 형식에 맞게 포맷팅 (현재 사용자 메시지 포함)
    #    (예: 최근 5 턴의 대화만 포함하도록 설정)
    #    format_prompt_with_history 함수를 약간 수정하거나 여기서 직접 포맷팅

    formatted_prompt_string = ""
    max_history_turns = 5  # 포함할 최대 과거 턴 수
    start_index = max(0, len(conversation_history) - 1 - (2 * max_history_turns))  # 현재 프롬프트 제외하고 계산

    # 과거 대화 + 현재 프롬프트 포맷팅
    for msg in conversation_history[start_index:]:
        role = msg.get("role")
        content = msg.get("content")
        if role and content:
            formatted_prompt_string += f"<start_of_turn>{role}\n{content}<end_of_turn>\n"

    formatted_prompt_string += "<start_of_turn>model\n"  # 모델 응답 시작 부분
    logger.debug(f"Formatted Prompt for LLM:\n{formatted_prompt_string}")

    try:
        # 3. 포맷팅된 프롬프트를 모델에 전달
        output = llm(
            formatted_prompt_string,  # <-- 수정된 포맷팅된 프롬프트 사용
            max_tokens=4096,  # 최대 생성 토큰 수 (필요시 조절)
            temperature=0.7,
            top_k=40,  # 필요시 top_k=0 설정 고려
            top_p=0.9,
            stop=["<end_of_turn>"],  # <-- 모델이 응답 끝맺음을 인식하도록 stop 토큰 추가
            echo=False
        )

        response_text = output["choices"][0]["text"].strip()

        # 4. 모델 응답을 대화 내역에 추가 ('assistant' 역할)
        current_assistant_message = {"role": "assistant", "content": response_text}
        conversation_history.append(current_assistant_message)

        # 5. (선택사항) 대화 내역 길이 제한 (메모리 관리)
        # 예: 최대 10개 턴(20개 메시지) 유지
        max_history_length = 20
        if len(conversation_history) > max_history_length:
            # 오래된 메시지부터 제거 (앞쪽 제거)
            conversation_history = conversation_history[-max_history_length:]
            logger.info(f"대화 내역 길이 제한 적용. 현재 길이: {len(conversation_history)}")

        logger.info(f"생성된 응답 길이: {len(response_text)}")
        # logger.debug(f"생성된 응답: {response_text}") # 너무 길 수 있으므로 DEBUG 레벨 사용 권장

        return {"response": response_text}

    except Exception as e:
        logger.error(f"텍스트 생성 중 오류 발생: {e}", exc_info=True)
        # 오류 발생 시 마지막 사용자 메시지 제거 (선택적이지만 권장)
        if conversation_history and conversation_history[-1] == current_user_message:
            conversation_history.pop()
            logger.info("오류 발생으로 마지막 사용자 메시지를 대화 내역에서 제거했습니다.")
        raise HTTPException(status_code=500, detail=f"텍스트 생성 중 내부 서버 오류 발생: {str(e)}")


# --- 앱 실행 ---
if __name__ == "__main__":
    # 모델이 성공적으로 로드되었는지 다시 확인
    if llm is None:
        logger.critical("모델 로딩에 실패하여 서버를 시작할 수 없습니다.")
    else:
        logger.info("FastAPI 서버 시작 (http://127.0.0.1:8000)")
        # host="0.0.0.0"으로 설정하면 외부에서도 접속 가능 (방화벽 설정 필요)
        uvicorn.run(app, host="127.0.0.1", port=8000)