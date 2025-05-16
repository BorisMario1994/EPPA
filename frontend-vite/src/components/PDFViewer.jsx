import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = worker;


const PDFViewer = ({ documentId, filePath, userId, requestId, type }) => {
    console.log('PDFViewer props:', { documentId, filePath, userId ,requestId});

    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [annotations, setAnnotations] = useState([]);
    const [selectedAnnotation, setSelectedAnnotation] = useState(null);
    const [annotationHistory, setAnnotationHistory] = useState([]);
    const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
    const [newAnnotation, setNewAnnotation] = useState({
        content: '',
        type: 'comment',
        pageNumber: 1,
        x: 0,
        y: 0
    });
    const [drawing, setDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [showAnnotationContent, setShowAnnotationContent] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [rotation, setRotation] = useState(0);

    const containerRef = useRef(null);

    useEffect(() => {
        console.log('PDFViewer mounted with documentId:', documentId);
        fetchAnnotations();
    }, [documentId]);
    console.log(documentId);
    const fetchAnnotations = async () => {
        try {
            const response = await fetch(`http://192.168.52.27:5000/api/documents/${documentId}/annotations`);
            if (response.ok) {
                const data = await response.json();
                setAnnotations(data);
            }
        } catch (error) {
            console.error('Error fetching annotations:', error);
        }
    };

    const fetchAnnotationHistory = async (annotationId) => {
        try {
            const response = await fetch(`http://192.168.52.27:5000/api/annotations/${annotationId}/history`);
            if (response.ok) {
                const data = await response.json();
                setAnnotationHistory(data);
            }
        } catch (error) {
            console.error('Error fetching annotation history:', error);
        }
    };

    const handlePageClick = (e) => {
        if (!isAddingAnnotation) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (newAnnotation.type === 'pointer') {
            setNewAnnotation(prev => ({ 
                ...prev,
                pageNumber,
                x,
                y
            }));
        } else if (newAnnotation.type === 'highlight') {
            if (!drawing) {
                setStartPoint({ x, y });
                setDrawing(true);
                setNewAnnotation(prev => ({
                    ...prev,
                    pageNumber,
                    x,
                    y
                }));
            } else {
                setNewAnnotation(prev => ({
                    ...prev,
                    pageNumber,
                    x1: startPoint.x,
                    y1: startPoint.y,
                    x2: x,
                    y2: y,
                    x,
                    y
                }));
                setDrawing(false);
                setStartPoint(null);
            }
        }
    };

    const handleAddAnnotation = async () => {
        console.log(requestId);
        console.log(documentId);
        try {
            const response = await fetch(`http://192.168.52.27:5000/api/documents/${documentId}/annotations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    requestId,
                    annotationType: newAnnotation.type,
                    ...newAnnotation
                }),
            });

            if (response.ok) {
                fetchAnnotations();
                setIsAddingAnnotation(false);
                setNewAnnotation({
                    content: '',
                    type: 'comment',
                    pageNumber: 1,
                    x: 0,
                    y: 0
                });
            }
        } catch (error) {
            console.error('Error adding annotation:', error);
        }
    };

    const handleAnnotationClick = (annotation) => {
        setSelectedAnnotation(annotation);
        fetchAnnotationHistory(annotation.AnnotationId);
    };

  
    return (
        <div className="pdf-viewer">
            <div className="pdf-controls no-print">
            {type !== 'done' && (
                <button
                    onClick={() => {
                        if (!isAddingAnnotation) {
                            setNewAnnotation({
                                content: '',
                                type: 'pointer',
                                pageNumber: pageNumber,
                                x: 0,
                                y: 0
                            });
                        }
                        setIsAddingAnnotation(v => !v);
                        setDrawing(false);
                        setStartPoint(null);
                    }}
                >
                    {isAddingAnnotation ? 'Cancel' : 'Add Annotation'}
                </button>
            )}

                <button onClick={() => setPageNumber(prev => Math.max(1, prev - 1))} disabled={pageNumber <= 1}>
                    Previous
                </button>
                <span>Page {pageNumber} of {numPages}</span>
                <button onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))} disabled={pageNumber >= numPages}>
                    Next
                </button>
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>-</button>
                <span>Zoom: {(scale * 100).toFixed(0)}%</span>
                <button onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</button>
                <button onClick={() => setRotation(r => (r + 90) % 360)}>Rotate</button>
                <button onClick={() => setShowAnnotationContent(v => !v)}>
                    {showAnnotationContent ? 'Hide Notes' : 'Show Notes'}
                </button>
         
            </div>

            <div
                className="pdf-container"
                ref={containerRef}
                onMouseMove={e => {
                    if (isAddingAnnotation && drawing && (newAnnotation.type === 'highlight')) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setNewAnnotation(prev => ({
                            ...prev,
                            x,
                            y
                        }));
                    }
                }}
            >
                <Document
                    file={`http://192.168.52.27:5000/${filePath.replace(/\\/g, '/')}`}
                    onLoadSuccess={({ numPages }) => {
                        console.log('PDF loaded successfully, pages:', numPages);
                        setNumPages(numPages);
                    }}
                    onLoadError={(error) => {
                        console.error('Error loading PDF:', error);
                        console.error('Attempted file path:', `http://192.168.52.27:5000/${filePath.replace(/\\/g, '/')}`);
                    }}
                >
                    {isPrinting
                        ? Array.from(new Array(numPages), (el, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                scale={scale}
                                rotate={rotation}
                                renderAnnotationLayer={true}
                                renderTextLayer={true}
                            >
                                {annotations
                                    .filter(a => a.PageNumber === index + 1)
                                    .map(annotation => {
                                        if (annotation.AnnotationType === 'pointer') {
                                            return (
                                                <div
                                                    key={annotation.AnnotationId}
                                                    className="annotation-marker"
                                                    style={{
                                                        left: `${annotation.XCoordinate}%`,
                                                        top: `${annotation.YCoordinate}%`
                                                    }}
                                                    onClick={() => handleAnnotationClick(annotation)}
                                                >
                                                    {showAnnotationContent && (
                                                        <span className="annotation-meta">
                                                            <span className="annotation-date">
                                                                {annotation.CreatedAt && (
                                                                    <span className="annotation-date">
                                                                        {annotation.CreatedAt.replace('T', ' ').replace('Z', '').slice(0, 19)} • {annotation.UserName}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="annotation-content">{annotation.Content}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        } else if (annotation.AnnotationType === 'highlight') {
                                            const left = Math.min(annotation.X1, annotation.X2);
                                            const top = Math.min(annotation.Y1, annotation.Y2);
                                            const width = Math.abs(annotation.X2 - annotation.X1);
                                            const height = Math.abs(annotation.Y2 - annotation.Y1);
                                            return (
                                                <div
                                                    key={annotation.AnnotationId}
                                                    className={`annotation-shape ${annotation.AnnotationType}`}
                                                    style={{
                                                        left: `${left}%`,
                                                        top: `${top}%`,
                                                        width: `${width}%`,
                                                        height: `${height}%`
                                                    }}
                                                    onClick={() => handleAnnotationClick(annotation)}
                                                >
                                                    {showAnnotationContent && (
                                                        <span className="annotation-meta">
                                                            <span className="annotation-date">
                                                                {annotation.CreatedAt && (
                                                                    <span className="annotation-date">
                                                                        {annotation.CreatedAt.replace('T', ' ').replace('Z', '').slice(0, 19)} • {annotation.UserName}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="annotation-content">{annotation.Content}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                            </Page>
                        ))
                        : (
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                rotate={rotation}
                                onClick={handlePageClick}
                                renderAnnotationLayer={true}
                                renderTextLayer={true}
                            />
                        )
                    }
                    {!isPrinting && annotations
                        .filter(a => a.PageNumber === pageNumber)
                        .map(annotation => {
                            if (annotation.AnnotationType === 'pointer') {
                                return (
                                    <div
                                        key={annotation.AnnotationId}
                                        className="annotation-marker"
                                        style={{
                                            left: `${annotation.XCoordinate}%`,
                                            top: `${annotation.YCoordinate}%`
                                        }}
                                        onClick={() => handleAnnotationClick(annotation)}
                                    >
                                        {showAnnotationContent && (
                                            <span className="annotation-meta">
                                                <span className="annotation-date">
                                                    {annotation.CreatedAt && (
                                                        <span className="annotation-date">
                                                            {annotation.CreatedAt.replace('T', ' ').replace('Z', '').slice(0, 19)} • {annotation.UserName}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="annotation-content">{annotation.Content}</span>
                                            </span>
                                        )}
                                    </div>
                                );
                            } else if (annotation.AnnotationType === 'highlight') {
                                const left = Math.min(annotation.X1, annotation.X2);
                                const top = Math.min(annotation.Y1, annotation.Y2);
                                const width = Math.abs(annotation.X2 - annotation.X1);
                                const height = Math.abs(annotation.Y2 - annotation.Y1);
                                return (
                                    <div
                                        key={annotation.AnnotationId}
                                        className={`annotation-shape ${annotation.AnnotationType}`}
                                        style={{
                                            left: `${left}%`,
                                            top: `${top}%`,
                                            width: `${width}%`,
                                            height: `${height}%`
                                        }}
                                        onClick={() => handleAnnotationClick(annotation)}
                                    >
                                        {showAnnotationContent && (
                                            <span className="annotation-meta">
                                                <span className="annotation-date">
                                                    {annotation.CreatedAt && (
                                                        <span className="annotation-date">
                                                            {annotation.CreatedAt.replace('T', ' ').replace('Z', '').slice(0, 19)} • {annotation.UserName}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="annotation-content">{annotation.Content}</span>
                                            </span>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })}
                </Document>

                {isAddingAnnotation && newAnnotation.pageNumber === pageNumber && (
                    <div
                        className="new-annotation-marker"
                        style={{
                            left: `${newAnnotation.x}%`,
                            top: `${newAnnotation.y}%`
                        }}
                    />
                )}

                {isAddingAnnotation && drawing && startPoint && (
                    <div
                        className={`annotation-shape ${newAnnotation.type}`}
                        style={{
                            left: `${Math.min(startPoint.x, newAnnotation.x)}%`,
                            top: `${Math.min(startPoint.y, newAnnotation.y)}%`,
                            width: `${Math.abs(newAnnotation.x - startPoint.x)}%`,
                            height: `${Math.abs(newAnnotation.y - startPoint.y)}%`
                        }}
                    />
                )}
            </div>

            {isAddingAnnotation && (
                <div className="annotation-form">
                    <select
                        value={newAnnotation.type}
                        onChange={e => setNewAnnotation(prev => ({ ...prev, type: e.target.value }))}
                    >
                        <option value="pointer">Pointer</option>
                        <option value="highlight">Highlight</option>
                    </select>
                    <textarea
                        value={newAnnotation.content}
                        onChange={(e) => setNewAnnotation(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter your annotation..."
                    />
                    <button onClick={handleAddAnnotation}>Save Annotation</button>
                </div>
            )}

            {selectedAnnotation && (
                <div className="annotation-details">
                    <h3>Annotation Details</h3>
                    <p>{selectedAnnotation.Content}</p>
                    <p>By: {selectedAnnotation.UserName}</p>
                    <p>Created: {annotation.CreatedAt.replace('T', ' ').replace('Z', '').slice(0, 19)}
                    </p>
                    
                    <h4>History</h4>
                    <div className="annotation-history">
                        {annotationHistory.map(history => (
                            <div key={history.HistoryId} className="history-item">
                                <p>Action: {history.Action}</p>
                                <p>By: {history.UserName}</p>
                                <p>At: {new Date(history.ChangedAt).toLocaleString()}</p>
                                {history.PreviousContent && (
                                    <p>Previous: {history.PreviousContent}</p>
                                )}
                                {history.NewContent && (
                                    <p>New: {history.NewContent}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFViewer;
