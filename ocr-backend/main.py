# -*- coding: utf-8 -*-
"""
Run this command to start the service (place key.pem + cert.pem in same folder):
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
"""


from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pytesseract
import cv2
import numpy as np
import os
import io
from PIL import Image
from datetime import datetime

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def preprocess_and_ocr(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)

    # Denoising
    denoised = cv2.fastNlMeansDenoising(contrast, h=10)

    # Sharpening
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(denoised, -1, kernel)

    # Resize
    resized = cv2.resize(sharpened, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Adaptive Thresholding
    adaptive_thresh = cv2.adaptiveThreshold(resized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                            cv2.THRESH_BINARY, 11, 2)

    # Morphological opening
    kernel_morph = np.ones((2, 2), np.uint8)
    opened = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_OPEN, kernel_morph)

    # OCR
    config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
    text = pytesseract.image_to_string(opened, config=config)
    return text.strip()

@app.post("/ocr")
async def scan_serial(image: UploadFile = File(...)):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"uploaded_{timestamp}.png"
        save_dir = "uploads"
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, filename)

        with open(filepath, "wb") as f:
            f.write(await image.read())

        result_text = preprocess_and_ocr(filepath)

        return {
            "success": True,
            "text": result_text,
            "file_saved": filename
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
