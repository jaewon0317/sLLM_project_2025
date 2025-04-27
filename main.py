# main.py (시간 측정 추가)

import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from llama_cpp import Llama
import os
import logging
import time # time 모듈 임포트

# --- (로깅, 모델 로드, 대화 내역 등 이전과 동일) ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
MODEL_PATH = "./google/googlegemma-3-4b-it-qat-q4_0-gguf/gemma-3-4b-it-q4_0.gguf" #
llm = None
try:
    # ... (모델 로드 코드) ... #
    llm = Llama(model_path=MODEL_PATH, n_ctx=64000, n_threads=6, n_gpu_layers=-1, n_batch=512, verbose=True) #
    logger.info("모델 로딩 성공!") #
except Exception as e:
    logger.error(f"모델 로딩 중 오류 발생: {e}", exc_info=True) #

conversation_history = [] #

app = FastAPI() #
app.mount("/static", StaticFiles(directory="app/front"), name="static") #

class PromptRequest(BaseModel): #
    prompt: str

# --- (format_prompt_with_history 함수 동일) ---
def format_prompt_with_history(history: list, current_prompt: str, max_history_turns: int = 5) -> str: #
    # ... (기존 코드) ... #
    pass # 실제 구현 필요

# --- 라우트 (Endpoints) ---
@app.get("/", response_class=HTMLResponse) #
async def read_root():
    # ... (기존 코드) ... #
    html_file_path = "app/front/index.html" #
    if not os.path.exists(html_file_path): #
        raise HTTPException(status_code=404, detail="index.html 파일을 찾을 수 없습니다.") #
    return FileResponse(html_file_path) #

@app.post("/generate") #
async def generate_text(request: PromptRequest): #
    global conversation_history

    if llm is None: #
        logger.error("모델이 로드되지 않았습니다. 요청을 처리할 수 없습니다.") #
        raise HTTPException(status_code=503, detail="모델 로딩 오류로 인해 서비스를 사용할 수 없습니다.") #

    prompt = request.prompt #
    logger.info(f"수신된 프롬프트: {prompt}") #

    # --- (대화 내역 추가 및 포맷팅 - 기존 코드) ---
    current_user_message = {"role": "user", "content": prompt} #
    conversation_history.append(current_user_message) #

    formatted_prompt_string = ""
    max_history_turns = 5
    start_index = max(0, len(conversation_history) - 1 - (2 * max_history_turns))
    for msg in conversation_history[start_index:]:
        role = msg.get("role")
        content = msg.get("content")
        if role and content:
            formatted_prompt_string += f"<start_of_turn>{role}\n{content}<end_of_turn>\n"
    formatted_prompt_string += "<start_of_turn>model\n"
    logger.debug(f"Formatted Prompt for LLM:\n{formatted_prompt_string}") #

    try:
        # --- 시간 측정 시작 ---
        start_time = time.time()

        # 모델 호출
        output = llm(
            formatted_prompt_string,
            max_tokens=4096,
            temperature=0.7,
            top_k=40,
            top_p=0.9,
            stop=["<end_of_turn>"],
            echo=False
        )

        # --- 시간 측정 종료 ---
        end_time = time.time()
        duration = round(end_time - start_time, 2) # 소수점 둘째 자리까지 계산
        logger.info(f"모델 응답 생성 소요 시간: {duration} 초") # 로그에 시간 출력

        response_text = output["choices"][0]["text"].strip() #

        # --- (대화 내역 추가 및 관리 - 기존 코드) ---
        current_assistant_message = {"role": "assistant", "content": response_text} #
        conversation_history.append(current_assistant_message) #
        # ... (대화 내역 길이 제한 코드) ... #
        max_history_length = 20 #
        if len(conversation_history) > max_history_length: #
             conversation_history = conversation_history[-max_history_length:] #
             logger.info(f"대화 내역 길이 제한 적용. 현재 길이: {len(conversation_history)}") #

        logger.info(f"생성된 응답 길이: {len(response_text)}") #

        # --- 응답에 소요 시간 포함 ---
        return {"response": response_text, "duration": duration} # duration 추가

    except Exception as e: #
        logger.error(f"텍스트 생성 중 오류 발생: {e}", exc_info=True) #
        # ... (오류 시 대화 내역 롤백 코드) ... #
        if conversation_history and conversation_history[-1] == current_user_message: #
            conversation_history.pop() #
            logger.info("오류 발생으로 마지막 사용자 메시지를 대화 내역에서 제거했습니다.") #
        raise HTTPException(status_code=500, detail=f"텍스트 생성 중 내부 서버 오류 발생: {str(e)}") #


# --- 앱 실행 ---
if __name__ == "__main__": #
    if llm is None: #
        logger.critical("모델 로딩에 실패하여 서버를 시작할 수 없습니다.") #
    else:
        logger.info("FastAPI 서버 시작 (http://127.0.0.1:8000)") #
        uvicorn.run(app, host="127.0.0.1", port=8000) #