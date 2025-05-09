import { useNavigate } from "react-router-dom";
import Webcam from 'react-webcam';
import "./Demo.css";
import { useState, useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";

const Demo = ({ isLoggedIn, username }) => {
    const [knownFaces, setKnownFaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState();
    const [newImgName, setNewImgName] = useState("");
    const [foundPeople, setFoundPeople] = useState([]);
    const [frontCamera, setFrontCamera] = useState(true);
    const [requestTime, setRequestTime] = useState(null);
    const [onnxSession, setOnnxSession] = useState(null);
    const camRef = useRef(null);
    const canvasRef = useRef(null);

    const apilink = "http://localhost:5001/";
    const modelPath = ""; 
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) getSavedFaces();
    }, [isLoggedIn]);

    useEffect(() => {
        const loadOnnxModel = async () => {
            try {
                const session = await ort.InferenceSession.create(modelPath);
                setOnnxSession(session);
            } catch (e) {
                console.error("Failed to load ONNX model:", e);
            }
        };
        loadOnnxModel();
    }, []);

    const getSavedFaces = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apilink}getsavedfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            if (data.worked) setKnownFaces(data.names);
        } catch (error) {
            console.error("Error fetching saved faces:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFace = async (name) => {
        try {
            const response = await fetch(`${apilink}removeface`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, img_name: name }),
            });
            const data = await response.json();
            if (data.worked) setKnownFaces(knownFaces.filter(face => face !== name));
        } catch (error) {
            console.error("Error removing face:", error);
        }
    };

    const handleAddFace = async () => {
        const capturedImage = camRef.current.getScreenshot();
        if (!capturedImage) {
            alert("Failed to capture image.");
            return;
        }

        const thisname = prompt("Give this image a name", "Steven");
        if (!thisname || thisname.length < 1 || /[^a-zA-Z0-9 ]/.test(thisname)) {
            alert("Name must be at least 1 character long and contain only alphanumeric characters.");
            return;
        }

        setNewImgName(thisname);
        setScreenshot(capturedImage);

        try {
            const response = await fetch(`${apilink}addface`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, b64_str: capturedImage, img_name: thisname }),
            });

            const data = await response.json();
            if (data.worked) {
                alert("Face successfully saved");
                getSavedFaces();
            } else {
                alert("Error while saving face.");
            }
        } catch (error) {
            alert("Error while saving face.");
            console.error(error);
        }
    };

    const handleRecognize = async () => {
        const capturedImage = camRef.current?.getScreenshot();
        if (!capturedImage) {
            alert("No image captured.");
            return;
        }

        setRequestTime(null);
        const startTime = performance.now();

        try {
            const imageTensor = await preprocessImage(capturedImage, 256, 256);
            const feeds = { input: imageTensor };
            const results = await onnxSession.run(feeds);

            const endTime = performance.now();
            setRequestTime(endTime - startTime);

            console.log("ONNX Inference Output:", results);

        } catch (e) {
            console.error("ONNX inference failed:", e);
        }
    };

    const preprocessImage = async (base64Img, width, height) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const { data } = imageData;

                const float32Data = new Float32Array(3 * width * height);
                for (let i = 0; i < width * height; i++) {
                    float32Data[i] = data[i * 4] / 255;
                    float32Data[i + width * height] = data[i * 4 + 1] / 255;
                    float32Data[i + 2 * width * height] = data[i * 4 + 2] / 255;
                }

                const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, height, width]);
                resolve(inputTensor);
            };
            img.src = base64Img;
        });
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
                        <canvas ref={canvasRef} width={640} height={480} className="canvas-overlay" />
                        {foundPeople.length > 0 && (
                            <div className="recognized-person-overlay">
                                {foundPeople.map((person, index) => (
                                    <h2 key={index}>{person.name}</h2>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="camera-buttons">
                        <button className="add-face-btn" onClick={handleAddFace}>Capture and Add Face</button>
                        <button onClick={handleRecognize}>Run ONNX Inference</button>
                        <button onClick={() => setFrontCamera(!frontCamera)}>Rotate Camera</button>
                    </div>

                    {requestTime !== null && (
                        <div className="request-time">
                            <p>ONNX inference took: {requestTime.toFixed(2)} ms</p>
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
                                <p key={index}>{person.name} - Location: [{person.location.join(", ")}]</p>
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

export default Demo;
