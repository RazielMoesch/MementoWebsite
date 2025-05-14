import { useNavigate } from "react-router-dom";
import Webcam from 'react-webcam';
import "./Demo.css";
import { useState, useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";
import * as faceapi from 'face-api.js';

const DemoTestOnnx = ({ isLoggedIn, username }) => {
    const [knownFaces, setKnownFaces] = useState([]);
    const [faceEmbeddings, setFaceEmbeddings] = useState({});
    const [loading, setLoading] = useState(false);
    const [foundPeople, setFoundPeople] = useState([]);
    const [frontCamera, setFrontCamera] = useState(true);
    const [requestTime, setRequestTime] = useState(null);
    const [onnxSession, setOnnxSession] = useState(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const camRef = useRef(null);
    const canvasRef = useRef(null);

    const apiLink = "http://localhost:5001/";
    const modelPath = `${import.meta.env.BASE_URL || ''}/models/MomentoRecognition_32.onnx`;
    const navigate = useNavigate();
    const similarityThreshold = 0.6;

    // Debug model path
    console.log("BASE_URL:", import.meta.env.BASE_URL);
    console.log("Model path:", modelPath);

    // Initialize ONNX runtime
    useEffect(() => {
        // Use only the SIMD WebAssembly file for simplicity
        const wasmPath = `${import.meta.env.BASE_URL || ''}/models/ort-wasm-simd.wasm`;
        console.log("WebAssembly path:", wasmPath);
        ort.env.wasm.wasmPaths = {
            'ort-wasm-simd.wasm': wasmPath
        };
    }, []);

    // Load face-api.js models with detailed error handling
    useEffect(() => {
        const loadFaceApiModels = async () => {
            const modelBasePath = `${import.meta.env.BASE_URL || ''}/models`;
            console.log("Loading face-api.js models from:", modelBasePath);
            try {
                await faceapi.nets.ssdMobilenetv1.loadFromUri(modelBasePath);
                console.log("ssdMobilenetv1 loaded successfully");
            } catch (error) {
                console.error("Failed to load ssdMobilenetv1 model:", error);
            }
            try {
                await faceapi.nets.faceLandmark68Net.loadFromUri(modelBasePath);
                console.log("faceLandmark68Net loaded successfully");
            } catch (error) {
                console.error("Failed to load faceLandmark68Net model:", error);
            }
            try {
                await faceapi.nets.faceRecognitionNet.loadFromUri(modelBasePath);
                console.log("faceRecognitionNet loaded successfully");
            } catch (error) {
                console.error("Failed to load faceRecognitionNet model:", error);
            }
        };
        loadFaceApiModels();
    }, []);

    // Load ONNX model
    useEffect(() => {
        const loadModel = async () => {
            try {
                setLoading(true);
                console.log("Attempting to load ONNX model from:", modelPath);
                const response = await fetch(modelPath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ONNX model: ${response.status} ${response.statusText}`);
                }
                const modelBuffer = await response.arrayBuffer();
                const session = await ort.InferenceSession.create(modelBuffer, {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all'
                });
                setOnnxSession(session);
                setModelLoaded(true);
                console.log("ONNX model loaded successfully");
            } catch (e) {
                console.error("Failed to load ONNX model:", e);
                alert("Failed to load model. Check console for details.");
            } finally {
                setLoading(false);
            }
        };
        loadModel();
        return () => {
            if (onnxSession) onnxSession.release();
        };
    }, []);

    // Load saved faces
    useEffect(() => {
        if (isLoggedIn && modelLoaded) getSavedFaces();
    }, [isLoggedIn, modelLoaded]);

    const getSavedFaces = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apiLink}getsavedfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            if (data.worked) {
                setKnownFaces(data.names);
                loadFaceEmbeddings(data.names);
            }
        } catch (error) {
            console.error("Error fetching saved faces:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadFaceEmbeddings = async (names) => {
        const embeddings = {};
        for (const name of names) {
            try {
                const response = await fetch(`${apiLink}getfaceembedding`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, img_name: name }),
                });
                const data = await response.json();
                if (data.worked && data.embedding) {
                    embeddings[name] = new Float32Array(data.embedding);
                }
            } catch (error) {
                console.error(`Error loading embedding for ${name}:`, error);
            }
        }
        setFaceEmbeddings(embeddings);
    };

    const preprocessImage = async (base64Img, box = null) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const targetSize = 256;
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext("2d");

                if (box) {
                    const { x, y, width, height } = box;
                    ctx.drawImage(img, x, y, width, height, 0, 0, targetSize, targetSize);
                } else {
                    const scale = Math.max(targetSize / img.width, targetSize / img.height);
                    const x = (targetSize - img.width * scale) / 2;
                    const y = (targetSize - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                }

                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                const { data } = imageData;

                const mean = [0.485, 0.456, 0.406];
                const std = [0.229, 0.224, 0.225];
                const float32Data = new Float32Array(3 * targetSize * targetSize);

                for (let i = 0; i < targetSize * targetSize; i++) {
                    float32Data[i] = (data[i * 4] / 255 - mean[0]) / std[0]; // R
                    float32Data[i + targetSize * targetSize] = (data[i * 4 + 1] / 255 - mean[1]) / std[1]; // G
                    float32Data[i + 2 * targetSize * targetSize] = (data[i * 4 + 2] / 255 - mean[2]) / std[2]; // B
                }

                const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, targetSize, targetSize]);
                resolve(inputTensor);
            };
            img.src = base64Img;
        });
    };

    const getFaceEmbedding = async (imageData, box = null) => {
        if (!onnxSession) throw new Error("Model not loaded");
        const imageTensor = await preprocessImage(imageData, box);
        const feeds = { input: imageTensor };
        const results = await onnxSession.run(feeds);
        const embedding = results.embedding.data;

        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return new Float32Array(embedding.map(val => val / norm));
    };

    const cosineSimilarity = (a, b) => {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    };

    const handleRecognize = async () => {
        if (!onnxSession) {
            alert("Model not loaded yet");
            return;
        }

        const capturedImage = camRef.current?.getScreenshot();
        if (!capturedImage) {
            alert("No image captured. Please try again.");
            return;
        }

        setRequestTime(null);
        const startTime = performance.now();

        try {
            const img = await faceapi.fetchImage(capturedImage);
            const detections = await faceapi.detectAllFaces(img).withFaceLandmarks();

            const matches = [];
            for (const detection of detections) {
                const { x, y, width, height } = detection.detection.box;
                const location = [y, x + width, y + height, x]; // [top, right, bottom, left]

                const embedding = await getFaceEmbedding(capturedImage, { x, y, width, height });

                for (const [name, knownEmbedding] of Object.entries(faceEmbeddings)) {
                    const similarity = cosineSimilarity(Array.from(embedding), Array.from(knownEmbedding));
                    if (similarity > similarityThreshold) {
                        matches.push({ name, location });
                    }
                }
            }

            setFoundPeople(matches);
            setRequestTime(performance.now() - startTime);
        } catch (e) {
            console.error("Recognition failed:", e);
            setFoundPeople([]);
            alert("Face recognition failed. Check console for details.");
        }
    };

    const handleAddFace = async () => {
        const capturedImage = camRef.current?.getScreenshot();
        if (!capturedImage) {
            alert("Failed to capture image, please try again.");
            return;
        }

        const thisname = prompt("Give this image a name", "Steven");
        if (!thisname || thisname.length < 1 || /[^a-zA-Z0-9 ]/.test(thisname)) {
            alert("Name must be at least 1 character long and contain only alphanumeric characters.");
            return;
        }

        try {
            const img = await faceapi.fetchImage(capturedImage);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();
            if (!detection) {
                alert("No face detected in the image.");
                return;
            }

            const { x, y, width, height } = detection.detection.box;
            const embedding = await getFaceEmbedding(capturedImage, { x, y, width, height });

            const response = await fetch(`${apiLink}addface`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    b64_str: capturedImage,
                    img_name: thisname,
                    embedding: Array.from(embedding)
                }),
            });

            const data = await response.json();
            if (data.worked) {
                alert("Face successfully saved");
                getSavedFaces();
            } else {
                alert("Error while saving face. Try again.");
            }
        } catch (error) {
            alert("Error while saving face. Try again.");
            console.error(error);
        }
    };

    const handleRemoveFace = async (name) => {
        try {
            const response = await fetch(`${apiLink}removeface`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, img_name: name }),
            });
            const data = await response.json();
            if (data.worked) {
                setKnownFaces(knownFaces.filter(face => face !== name));
                setFaceEmbeddings(prev => {
                    const newEmbeddings = { ...prev };
                    delete newEmbeddings[name];
                    return newEmbeddings;
                });
            }
        } catch (error) {
            console.error("Error removing face:", error);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        foundPeople.forEach(({ name, location }) => {
            const [top, right, bottom, left] = location;
            const width = right - left;
            const height = bottom - top;

            ctx.strokeStyle = "lime";
            ctx.lineWidth = 3;
            ctx.strokeRect(left, top, width, height);

            ctx.fillStyle = "lime";
            ctx.font = "16px sans-serif";
            ctx.fillText(name, left, top - 8);
        });
    }, [foundPeople]);

    return (
        <>
            {!isLoggedIn ? (
                <div className="login-prompt">
                    <h1>You must log in to access the demo.</h1>
                    <button onClick={() => navigate("/login")}>Start Login</button>
                </div>
            ) : (
                <div className="demo-container">
                    <div className="webcam-container">
                        <Webcam
                            className="webcam-view"
                            ref={camRef}
                            screenshotFormat="image/jpeg"
                            width={640}
                            height={480}
                            videoConstraints={{
                                facingMode: frontCamera ? "user" : { exact: "environment" }
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="canvas-overlay"
                        />
                        {foundPeople.length > 0 && (
                            <div className="recognized-person-overlay">
                                {foundPeople.map((person, index) => (
                                    <h2 key={index}>{person.name}</h2>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="camera-buttons">
                        <button className="add-face-btn" onClick={handleAddFace} disabled={loading || !modelLoaded}>
                            Capture and Add Face
                        </button>
                        <button onClick={handleRecognize} disabled={loading || !modelLoaded}>
                            Recognize Faces
                        </button>
                        <button onClick={() => setFrontCamera(!frontCamera)}>
                            Rotate Camera
                        </button>
                    </div>

                    {requestTime !== null && (
                        <div className="request-time">
                            <p>Recognition request took: {requestTime.toFixed(2)} milliseconds</p>
                        </div>
                    )}

                    <div className="face-manager">
                        <h3>Saved Faces</h3>
                        {loading ? (
                            <p>Loading...</p>
                        ) : knownFaces.length > 0 ? (
                            knownFaces.map((name, idx) => (
                                <div className="known-face" key={idx}>
                                    <p>{name}</p>
                                    <button onClick={() => handleRemoveFace(name)}>Remove</button>
                                </div>
                            ))
                        ) : (
                            <p>No saved faces yet.</p>
                        )}
                    </div>

                    <div className="recognized-faces">
                        <h3>Recognized Faces:</h3>
                        {foundPeople.length > 0 ? (
                            foundPeople.map((person, index) => (
                                <p key={index}>
                                    {person.name} - Location: [{person.location.join(", ")}]
                                </p>
                            ))
                        ) : (
                            <p>No face recognized yet.</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default DemoTestOnnx;