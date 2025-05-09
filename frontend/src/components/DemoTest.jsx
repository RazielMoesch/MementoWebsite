import { useNavigate } from "react-router-dom";
import Webcam from 'react-webcam';
import "./Demo.css";
import { useState, useEffect, useRef } from "react";

const Demo = ({ isLoggedIn, username }) => {
    const [knownFaces, setKnownFaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState();
    const [newImgName, setNewImgName] = useState("");
    const [foundPeople, setFoundPeople] = useState([]);
    const [frontCamera, setFrontCamera] = useState(true);
    const [requestTime, setRequestTime] = useState(null);
    const camRef = useRef(null);
    const canvasRef = useRef(null);

    const apilink = "http://localhost:5001/";
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            getSavedFaces();
        }
    }, [isLoggedIn]);

    const getSavedFaces = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apilink}getsavedfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            if (data.worked) {
                setKnownFaces(data.names);
            }
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
            if (data.worked) {
                setKnownFaces(knownFaces.filter(face => face !== name));
            }
        } catch (error) {
            console.error("Error removing face:", error);
        }
    };

    const handleAddFace = async () => {
        const capturedImage = camRef.current.getScreenshot();
        if (!capturedImage) {
            alert("Failed to capture image, please try again.");
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
                alert("Error while saving face. Try again.");
            }
        } catch (error) {
            alert("Error while saving face. Try again.");
            console.error(error);
        }
    };

    const handleRecognize = async () => {
        const capturedImage = camRef.current?.getScreenshot();
        if (!capturedImage) {
            alert("No image captured. Please try again.");
            return;
        }

        setRequestTime(null);
        const startTime = performance.now();
        
        try {
            const response = await fetch(`${apilink}recognize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, b64_str: capturedImage }),
            });

            const endTime = performance.now();
            const duration = endTime - startTime;
            setRequestTime(duration);

            const data = await response.json();
            if (data.worked) {
                setFoundPeople(data.faces);
            } else {
                setFoundPeople([]);
            }
        } catch (error) {
            console.error("Error recognizing face:", error);
            setFoundPeople([]);
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
                        <button className="add-face-btn" onClick={handleAddFace}>
                            Capture and Add Face
                        </button>
                        <button onClick={handleRecognize}>
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

export default Demo;