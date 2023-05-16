import React, { useRef, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { SketchPicker } from "react-color";
import JSZip from "jszip";
import "./styles.css";
import { FaEraser, FaPlus } from 'react-icons/fa'


const App = () => {
  const [images, setImages] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [color, setColor] = useState("#FF0000");
  const [erase, setErase] = useState(false);
  const imageCanvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const [sideMargin, setSideMargin] = useState(0);

  const { getRootProps, getInputProps } = useDropzone({
    accept: "image/*",
    multiple: true,
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));

      const sortedImages = sortImages([...images, ...newImages]);
      setImages(sortedImages);

      setAnnotations((prevAnnotations) => [
        ...prevAnnotations,
        ...Array(acceptedFiles.length).fill("data:image/png;base64,"),
      ]);
    },
  });

  // 新しい関数 sortImages を追加
  const sortImages = (images) => {
    return images.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
  };

  const annotationContextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (images.length) {
      const annotationCanvas = annotationCanvasRef.current;
      const annotationContext = annotationCanvas.getContext("2d");
      annotationContextRef.current = annotationContext;
    }
  }, [images]);

  useEffect(() => {
    const annotationContext = annotationContextRef.current;
    if (annotationContext) {
      annotationContext.globalCompositeOperation = erase
        ? "destination-out"
        : "source-over";
    }
  }, [erase]);

  useEffect(() => {
    if (annotations[currentImageIndex]) {
      const annotationContext = annotationContextRef.current;
      const annotationImage = new Image();
      annotationImage.src = annotations[currentImageIndex];
      annotationImage.onload = () => {
        annotationContext.clearRect(
          0,
          0,
          annotationCanvasRef.current.width,annotationCanvasRef.current.height
          );
          annotationContext.drawImage(annotationImage, 0, 0);
        };
      } else if (annotationContextRef.current) {
        annotationContextRef.current.clearRect(
          0,
          0,
          annotationCanvasRef.current.width,
          annotationCanvasRef.current.height
        );
      }
    }, [annotations, currentImageIndex]);
  
    const handleMouseDown = ({ nativeEvent }) => {
      const { offsetX, offsetY } = nativeEvent;
      annotationContextRef.current.beginPath();
      annotationContextRef.current.lineWidth = 5;
      annotationContextRef.current.lineCap = "round";
      annotationContextRef.current.strokeStyle = color;
      annotationContextRef.current.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    };
  
    const handleMouseMove = ({ nativeEvent }) => {
      if (!isDrawing) return;
      const { offsetX, offsetY } = nativeEvent;
      annotationContextRef.current.lineTo(offsetX, offsetY);
      annotationContextRef.current.stroke();
    };
  
    const handleMouseUp = () => {
      annotationContextRef.current.closePath();
      setIsDrawing(false);
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations];
        newAnnotations[currentImageIndex] = annotationCanvasRef.current.toDataURL(
          "image/png"
        );
        return newAnnotations;
      });
    };
    const updateAnnotationCanvas = () => {
      if (annotations[currentImageIndex]) {
        const annotationContext = annotationContextRef.current;
        const annotationImage = new Image();
        annotationImage.src = annotations[currentImageIndex];
        annotationImage.onload = () => {
          annotationContext.clearRect(
            0,
            0,
            annotationCanvasRef.current.width,
            annotationCanvasRef.current.height
          );
          annotationContext.drawImage(annotationImage, 0, 0);
        };
      } else if (annotationContextRef.current) {
        annotationContextRef.current.clearRect(
          0,
          0,
          annotationCanvasRef.current.width,
          annotationCanvasRef.current.height
        );
      }
    };    

    const handleImageLoad = () => {
      if (images.length) {
        const imageCanvas = imageCanvasRef.current;
        const imageContext = imageCanvas.getContext("2d");
        const img = new Image();
        img.src = images[currentImageIndex].url;
        img.onload = () => {
          imageCanvas.width = img.width;
          imageCanvas.height = img.height;
          annotationCanvasRef.current.width = img.width;
          annotationCanvasRef.current.height = img.height;
          imageContext.drawImage(img, 0, 0);
          updateAnnotationCanvas();
    
          // Update sideMargin
          setSideMargin( img.width/20 );
        };
      }
    };
    
  
    const [customColors, setCustomColors] = useState(["#FF0000", "#0000FF"]);
    const [displayPicker, setDisplayPicker] = useState(false);
  
    const handleClick = () => {
      setDisplayPicker(!displayPicker);
    };
  
    const handleClose = () => {
      setDisplayPicker(false);
    };
  
    const handleColorSelect = (color) => {
      setColor(color);
      setDisplayPicker(false);
      if (!customColors.includes(color)) {
        setCustomColors([...customColors, color]);
      }
    };
  
  
    const handleExport = async () => {
      const zip = new JSZip();
  
      const processImage = (annotationImageSrc) => {
        return new Promise(async (resolve) => {
          // If the annotationImageSrc is the default data URL, create a black image
          if (annotationImageSrc === "data:image/png;base64,") {
            const tempCanvas = document.createElement("canvas");
            const tempContext = tempCanvas.getContext("2d");
            tempCanvas.width = imageCanvasRef.current.width;
            tempCanvas.height = imageCanvasRef.current.height;
  
            // Set the background to black
            tempContext.fillStyle = "rgba(0, 0, 0, 1)"; // Black
            tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
            // Get the modified image data
            const modifiedImageData = tempCanvas.toDataURL("image/png").replace("data:image/png;base64,", "");
  
            resolve(modifiedImageData);
          } else {
            const annotationImage = new Image();
            annotationImage.src = annotationImageSrc;
  
            annotationImage.onload = () => {
              const tempCanvas = document.createElement("canvas");
              const tempContext = tempCanvas.getContext("2d");
              tempCanvas.width = annotationImage.width;
              tempCanvas.height = annotationImage.height;
  
              // Set the background to black
              tempContext.fillStyle = "rgba(0, 0, 0, 1)"; // Black
              tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
              // Draw the annotation image
              tempContext.globalCompositeOperation = "source-atop";
              tempContext.drawImage(annotationImage, 0, 0);
  
              // Get the modified image data
              const modifiedImageData = tempCanvas.toDataURL("image/png").replace("data:image/png;base64,", "");
  
              resolve(modifiedImageData);
            };
          }
        });
      };
  
      const processAllImages = async () => {
        const modifiedImagesData = [];
        for (const annotationImageSrc of annotations) {
          const modifiedImageData = await processImage(annotationImageSrc);
          modifiedImagesData.push(modifiedImageData);
        }
        return modifiedImagesData;
      };
  
      const modifiedImagesData = await processAllImages();
  
    modifiedImagesData.forEach((modifiedImageData, index) => {
      const originalFileName = images[index].name;
      const fileBaseName = originalFileName.split('.').slice(0, -1).join('.');
      const fileExtension = originalFileName.split('.').pop();
      zip.file(`${fileBaseName}_labeled.${fileExtension}`, modifiedImageData, {
        base64: true,
      });
    });
  
      const zipFile = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipFile);
      link.download = "annotation-layers.zip";
      link.click();
    };
    
    
    useEffect(() => {
      handleImageLoad();
    }, [images, currentImageIndex]);

    const [showAnnotation, setShowAnnotation] = useState(true); // 新しい状態を追加

    const handleToggleAnnotation = () => {
      setShowAnnotation(!showAnnotation);
    };

    const handleColorDelete = (colorToDelete) => {
      setCustomColors(customColors.filter((customColor) => customColor !== colorToDelete));
    };
  

    return (
      <div>
        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          <p>ドラッグ＆ドロップ、またはクリックして画像をアップロード</p>
        </div>
        {images.length > 0 && (
          <div className="image-container">
            <div className="image-section">
            <div style={{ width: imageCanvasRef.current ? imageCanvasRef.current.width : '100%' }}>
             <input
              type="range"
              min="0"
              max={images.length - 1}
              value={currentImageIndex}
              onChange={(e) => setCurrentImageIndex(e.target.value)}
              className="image-slider"
              style={{ width: '100%' }}
              />
              </div>
              <div className="canvas-container">
                <canvas ref={imageCanvasRef} className="image-canvas" />
                <canvas
                  ref={annotationCanvasRef}
                  className={
                    showAnnotation ? "annotation-canvas" : "annotation-canvas-hidden"
                  }
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            </div>
            <div className="settings-section">
              <div className="view-setting">
                <div className="settings-title">View Setting</div>
                <label>
                  Show Annotation:
                  <input
                    type="checkbox"
                    checked={showAnnotation}
                    onChange={handleToggleAnnotation}
                  />
                </label>
              </div>
              <div className="parameter-setting">
    <div className="settings-title">Parameter Setting</div>

    {/* Erase button */}
    <button onClick={() => setErase(!erase)} className="erase-button">
      <FaEraser color={erase ? "red" : "gray"} />
    </button>
                <div className="custom-colors">
                  {customColors.map((customColor) => (
                    <div key={customColor} className="custom-color">
                      <button
                        style={{ backgroundColor: customColor }}
                        className="color-button"
                        onClick={() => handleColorSelect(customColor)}
                      />
                      <button
                        className="delete-color"
                        onClick={() => handleColorDelete(customColor)}
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {displayPicker ? (
                    <div className="color-picker-container">
                      <div className="color-picker-overlay" onClick={handleClose} />
                      <SketchPicker
                        color={color}
                        onChange={(color) => handleColorSelect(color.hex)}
                      />
                    </div>
                  ) : null}
                </div>
                {/* Add color button */}
                <button onClick={handleClick} className="add-color-button">
                <FaPlus size="16" /> 
               </button>
              </div>
            </div>
          </div>
        )}
       {images.length > 0 && (
       <button onClick={handleExport} className="export-button">
        Export
    </button>
  )}
      </div>
    );
  }
  
  export default App;