from flask import Flask, request, jsonify
import pandas as pd
import torch
import faiss
from sentence_transformers import SentenceTransformer
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)

# Detect device (GPU or CPU)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load Sentence Transformer model
model = SentenceTransformer("paraphrase-MiniLM-L6-v2").to(device)

# Load FIR data
try:
    df = pd.read_csv("FIR_Details.csv", low_memory=False, dtype=str, nrows=1000)
    print("✅ CSV file loaded successfully!")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    exit(1)

# Keep only necessary columns & preprocess
df = df[["CrimeHead_Name", "Place of Offence", "FIR_YEAR", "Accused Count"]].fillna("")
df["Processed_Text"] = df[["CrimeHead_Name", "Place of Offence"]].agg(" ".join, axis=1).str.lower()

# **Step 1: Compute embeddings & store in FAISS index**
stored_embeddings = model.encode(df["Processed_Text"].tolist(), convert_to_tensor=False, device=device).astype(np.float32)

# Normalize embeddings for cosine similarity
stored_embeddings /= np.linalg.norm(stored_embeddings, axis=1, keepdims=True)

# Create FAISS index
embedding_dim = stored_embeddings.shape[1]
faiss_index = faiss.IndexFlatIP(embedding_dim)
faiss_index.add(stored_embeddings)

print("✅ FAISS index built successfully!")

@app.route("/upload", methods=["POST"])
def upload_crime_report():
    """Handles crime report uploads and returns similar cases."""
    uploaded_file = request.files.get("file")
    
    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        crime_text = uploaded_file.read().decode("utf-8", errors="ignore").strip().lower()
        if not crime_text:
            return jsonify({"error": "Uploaded file is empty"}), 400
    except Exception as e:
        return jsonify({"error": f"File processing error: {str(e)}"}), 400

    # **Step 2: Encode uploaded case & search in FAISS**
    try:
        input_embedding = model.encode(crime_text, convert_to_tensor=False, device=device).astype(np.float32)
        input_embedding /= np.linalg.norm(input_embedding)  # Normalize
    except Exception as e:
        return jsonify({"error": f"Embedding generation failed: {str(e)}"}), 500

    k = 10  # Retrieve top 10 matches
    distances, indices = faiss_index.search(np.array([input_embedding]), k)

    response_data = []
    unique_cases = set()  # Track unique cases

    for i in range(k):
        index = int(indices[0][i])  # Ensure valid index
        similarity = round(float(distances[0][i]), 2)

        if similarity < 0.3:  # Skip low-similarity results
            continue

        # Extract case details
        crime = df.iloc[index]["CrimeHead_Name"]
        place = df.iloc[index]["Place of Offence"]
        year = df.iloc[index]["FIR_YEAR"]
        accused_count = df.iloc[index]["Accused Count"]

        case_key = (crime.lower(), place.lower(), year)

        if case_key in unique_cases:  # Skip duplicates
            continue

        unique_cases.add(case_key)  # Track case

        # Prepare response
        case_details = {
            "Crime": crime,
            "Year": year if year else "Unknown",
            "Place": place if place else "Unknown",
            "Accused Count": accused_count if accused_count else "N/A",
            "Similarity Score": similarity
        }

        # Explanation of similarity
        explanation = []
        if crime.lower() in crime_text:
            explanation.append(f"Crime type matches ({crime})")
        if place.lower() in crime_text:
            explanation.append(f"Location pattern matches ({place})")
        if year and year in crime_text:
            explanation.append(f"Same year of occurrence ({year})")

        case_details["Similarities Found"] = ", ".join(explanation) if explanation else "General similarity in report text."
        response_data.append(case_details)

    return jsonify({"similar_cases": response_data, "total_found": len(response_data)}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
