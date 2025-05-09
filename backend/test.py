import base64
from PIL import Image
from io import BytesIO
from utils import ImageProcessing

obama = "backend/Obama.jpg"

# Initialize your image processor
processor = ImageProcessing()

# Open the image and convert it to a byte stream
with open(obama, "rb") as img_file:
    img_bytes = img_file.read()

# Encode the image to base64
b64_img = base64.b64encode(img_bytes).decode('utf-8')  # Decoding to a string

# Pass the base64-encoded image for recognition
results = processor.recognize(username="Raziel", b64_str=b64_img)

print("Results:", results)
