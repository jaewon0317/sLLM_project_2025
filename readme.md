
# 🌟 sLLMproject2025: 로컬 sLLM 웹 애플리케이션 🌟  

---

## 1.프로젝트 개요  
* 이 프로젝트는 **로컬에서 실행되는 초경량 대형 언어 모델(sLLM)** `gemma-3-4b-it` (양자화 버전)을 기반으로 한 **웹 애플리케이션**입니다.  
* 한국어를 포함한 다양한 언어로 자연어 처리를 수행하며, **직관적인 UI**로 사용자와 AI의 소통을 한층 더 매끄럽게 만듭니다.  
* 로컬 환경에 최적화된 이 앱은 **GPU 가속**으로 빠르고 강력한 성능을 자랑하며, CPU만으로도 실행 가능해 접근성을 높였습니다. 

---

# 핵심 모델 gemma-3-4b-it-qat-q4_0-gguf
🔗 [**google/gemma-3-4b-it-qat-q4_0.gguf**](https://huggingface.co/google/gemma-3-4b-it-qat-q4_0-gguf) 

### * QAT (Quantization-Aware Training) 양자화 버전이란?
**QAT (Quantization-Aware Training)** 는 모델 훈련(Training) 또는 미세조정(Fine-tuning) 과정 중에 양자화(Quantization)를 미리 시뮬레이션하여 적용하는 기술입니다.
- **양자화(Quantization)** 는 모델의 파라미터(가중치 등)를 더 적은 비트 수(예: 32비트 부동소수점 → 4비트 정수)로 표현하여, 모델 크기를 줄이고 추론 속도를 높이는 기법입니다.
일반적으로 양자화를 수행하면 모델 성능(정확도)이 일부 저하될 수 있습니다.
QAT는 훈련 단계에서부터 양자화로 인한 정밀도 손실을 모델이 학습하도록 유도하여, 단순히 훈련 후에 양자화하는 방식(PTQ: Post-Training Quantization)보다 정확도 저하를 최소화할 수 있습니다.
- **결론: QAT 양자화 버전은 원본 모델 대비 정확도 손실은 최소화하면서, 모델 크기는 작고 추론 속도는 빠른 장점을 가지는 경량화된 모델 버전입니다.** <br><br>

## Gemma-3-4B vs Gemma-3-4B-QAT 비교

### 장점
- **모델 크기 감소:**
  
    * 가중치 16비트 부동소수점 → 4비트 정수
    * 원본 모델(gemma-3-4b-it)의 크기가 약 8GB (FP16 기준)인 반면, 양자화된 gemma-3-4b-it-qat-q4_0-gguf는 약 2.5~3GB로 줄어듭니다.
    * 저장 공간을 적게 차지하고 모델 다운로드 및 로딩 시간이 단축됩니다.

- **추론 속도 향상 (Latency 감소):**
  
    * 4비트 정수 연산은 부동소수점 연산보다 계산 속도가 빠르며, 특히 CPU, NPU, 또는 특정 가속기에서 효율적입니다.
    * 모델 크기가 작아져 메모리에서 데이터를 읽어오는 데 필요한 시간(메모리 대역폭 요구량 감소)도 줄어듭니다.
    * 결과적으로 동일한 하드웨어에서 추론 속도가 1.5~2배 향상될 수 있습니다.성능 향상 폭은 하드웨어 및 사용된 추론 엔진(라이브러리)에 따라 다릅니다.

- **메모리 사용량 감소:**
  
    * 양자화로 인해 추론 시 RAM 또는 VRAM 사용량이 약 50~70% 감소합니다.
    * 이는 리소스가 제한된 환경(예: 모바일 기기, 엣지 디바이스, 저사양 PC)에서 모델 실행에 적합합니다. 예를 들어, 4GB VRAM GPU에서도 실행 가능성이 높아집니다.

- **에너지 효율성 증가:**
    * 감소된 연산량과 메모리 접근은 전력 소비를 줄여 에너지 효율적인 모델 실행을 가능하게 합니다. 이는 배터리 기반 디바이스에서 특히 유리합니다.

### 단점 또는 고려사항

- **미미한 정확도 손실 가능성:**
  * QAT는 양자화로 인한 정확도 손실을 최소화하도록 설계되었지만, 4비트 양자화는 원본 FP16 모델 대비 미미한 성능 저하를 유발할 수 있습니다.
  * Hugging Face 페이지에 따르면, gemma-3-4b-it-qat-q4_0-gguf는 대부분의 태스크에서 원본과 비슷한 성능을 유지하지만, 특정 고정밀 작업(예: 복잡한 수학적 추론)에서는 추가 검증이 필요할 수 있습니다.
  
- **호환성 고려:**
  * QAT 모델은 GGUF 포맷으로 제공되며, llama.cpp와 같은 특정 추론 엔진에 최적화되어 있습니다. 따라서 사용자는 호환 가능한 소프트웨어 스택을 준비해야 합니다.
  * 원본 모델은 PyTorch 또는 Hugging Face Transformers와 같은 프레임워크에서 더 쉽게 실행 가능합니다.

**요약:** QAT 버전은 원본 대비 **정확도 손실은 최소화하면서, 모델 크기는 작고 추론 속도는 빠른 장점**을 가지는 경량화된 모델 버전입니다. 리소스가 제한된 환경에 특히 유용합니다.

---

## 🛠️ 기술 스택  

<div align="center">
  <br>
  <img src="https://img.shields.io/badge/CMake-064F8C?style=for-the-badge&logo=cmake&logoColor=white">
</div>
<div align=center>
  <img src="https://img.shields.io/badge/Llama.cpp-003087?style=for-the-badge&logo=c%2B%2B&logoColor=white">
  <img src="https://img.shields.io/badge/CUDA-76B900?style=for-the-badge&logo=nvidia&logoColor=white">
  <img src="https://img.shields.io/badge/python-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi">
  <br>
  <img src="https://img.shields.io/badge/html5-E34F26?style=for-the-badge&logo=html5&logoColor=white">
  <img src="https://img.shields.io/badge/css-1572B6?style=for-the-badge&logo=css3&logoColor=white">
  <img src="https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
    <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white">
  <img src="https://img.shields.io/badge/Marked.js-000000?style=for-the-badge&logo=markdown&logoColor=white">
  <br>
  <img src="https://img.shields.io/badge/jinja-B41717?style=for-the-badge&logo=jinja&logoColor=white">
  <img src="https://img.shields.io/badge/pytorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white">
  <img src="https://img.shields.io/badge/transformers-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black">
  <br><br>
</div>

| 🛠️ **항목**       |  **내용**                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **언어 모델**      | `google/gemma-3-4b-it` (GGUF, q4_0 양자화)                                   |
| **모델 로더**      | `llama-cpp-python` (GPU 가속 지원,c++ 컴파일러 필요)                                          |
| **백엔드**         | `FastAPI` (비동기 처리로 빠르고 효율적)                                     |
| **프론트엔드**     | `HTML`, `CSS`, `JavaScript` (jQuery, Marked.js, DOMPurify로 깔끔한 UI)    |
| **실행 환경**      | Python, **GPU (CUDA) 가속** 권장, CPU 호환 가능                             |

---

## ✨주요 기능  

| **기능**           | **설명**                                         |
|------------------|------------------------------------------------|
| **다국어 지원**       | 한국어를 포함한 140개의 다양한 언어로 자연스러운 대화 가능      |
| **웹 기반 UI**      | 채팅 로그와 입력창이 분리된 **직관적인 인터페이스**             |
| **다크/라이트 테마**    | 눈이 편안한 테마 전환                                   |
| **Markdown 렌더링** | 깔끔하고 읽기 쉬운 응답 포맷팅                              |
| **비동기 백엔드**      | `FastAPI`로 빠르고 부드러운 서버 응답                      |
| **로컬 모델 실행**     | `llama-cpp-python`으로 GPU 가속 지원, 로컬에서 강력한 성능 발휘 |
| **대화 맥락 유지**   | 대화 흐름을 유지해 자연스러운 상호작용 가능 (최대 128K token)    |
| **응답 시간 표시**     | gpu,cpu 사용 상황에 따라 응답시간을 확인 가능                  |

---

## 실행 화면 미리보기  
![sLLMproject2025 UI](ex.png)  
>*채팅 UI,Markdown 렌더링,맥락유지,응답시간 표시 기능을 구현했습니다.*
---


## 오픈소스 기반으로 다양한 파라미터 커스터미이징
```
llm = Llama(
    model_path=MODEL_PATH,    # 모델 파일 경로
    n_ctx=64000,              # 모델이 처리할 수 있는 최대 컨텍스트 길이 (토큰 수)
    n_threads=6,              # 추론에 사용할 CPU 스레드 수
    n_gpu_layers=-1,          # GPU에 오프로드할 레이어 수 (-1은 가능한 만큼 모두 사용)
    n_batch=512,              # 배치 처리 크기
    verbose=True              # 상세 로그 출력 여부
)
```

```
# 텍스트 생성 요청 및 파라미터 설정
output = llm(
    formatted_prompt_string,
    max_tokens=4096,          # 생성할 최대 토큰 수 제한
    temperature=0.7,          # 출력의 무작위성 조절 (낮을수록 결정적, 높을수록 다양)
    top_k=40,                 # 상위 K개의 후보 토큰 중에서만 샘플링
    top_p=0.9,                # 누적 확률 P 이상의 후보 토큰 중에서만 샘플링 (Nucleus Sampling)
    stop=["<end_of_turn>"],   # 지정된 문자열이 생성되면 중단
    echo=False                # 입력 프롬프트를 출력에 포함하지 않음
)
```
