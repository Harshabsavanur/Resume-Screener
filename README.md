# Resume-Screener
An NLP-powered Python backend tool that automates resume screening. It parses PDF/DOCX files, extracts key skills, and uses semantic matching to score and rank candidates against job descriptions. Perfect for ATS integration.  Tech Stack: Python, SpaCy, Scikit-learn.  Features automated parsing, text vectorization, and structured ranking.
Here is a specific, high-impact description tailored for a GitHub repository. It clearly defines the technical scope, project architecture, and core modules of your Python backend application.

NLP Resume Scanner & Matcher
A specialized Python backend service designed to automate talent acquisition pipelines. The system parses unstructured resume data (PDF/DOCX), isolates technical competencies, and utilizes vector space modeling to score and rank candidates against specific job descriptions.

🏗️ Core Architecture & Modules
The system operates via four interconnected pipelines:

Ingestion & Text Extraction: Utilizes pdfplumber and python-docx to extract raw string data from various document formats while preserving layout boundaries.

NLP Text Preprocessing: Cleans data using SpaCy for tokenization, lemmatization, and stop-word removal. Employs Named Entity Recognition (NER) to isolate distinct entities like Skills, Experience, and Education.

Vectorization & Semantic Matching: Converts text into numerical representations using Scikit-learn (TF-IDF / CountVectorizer) and computes a semantic match percentage using Cosine Similarity.

Ranking Engine: Processes multiple files simultaneously, sorting data into a structured JSON payload that ranks applicants from highest to lowest compatibility.

🛠️ Tech Stack & Dependencies
Language: Python 3.10+

NLP Libraries: SpaCy (en_core_web_sm), NLTK

Vector Modeling: Scikit-learn (Machine Learning pipelines)

Data Parsers: pdfplumber, python-docx

API Layer: FastAPI (Asynchronous request handling)
