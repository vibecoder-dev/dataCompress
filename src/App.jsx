import { useState } from "react";

export default function FileCompressor() {
  const [compressedText, setCompressedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [restoredBlob, setRestoredBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDecompressing, setIsDecompressing] = useState(false);

  // --- Safe Base64 conversion helpers ---
  const uint8ToBase64 = (u8) => {
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < u8.length; i += chunkSize) {
      const chunk = u8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  const base64ToUint8 = (b64) => {
    const binary = atob(b64);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binary.charCodeAt(i);
    }
    return u8;
  };

  // --- Compression with browser API ---
  const compress = async (blob) => {
    const cs = new CompressionStream("gzip");
    const compressedStream = blob.stream().pipeThrough(cs);
    return new Uint8Array(await new Response(compressedStream).arrayBuffer());
  };

  const decompress = async (u8) => {
    const ds = new DecompressionStream("gzip");
    const decompressedStream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
  };

  // 1. Upload original file → Compress → Base64 text
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setIsCompressing(true);
    setFileName(file.name);

    try {
      const compressedBytes = await compress(file);
      const base64 = uint8ToBase64(compressedBytes);
      setCompressedText(base64);
    } catch (err) {
      setError("Failed to compress file: " + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // 2. Download compressed TXT
  const downloadTxt = () => {
    const blob = new Blob([compressedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".compressed.txt";
    a.click();
  };

  // 3. Upload TXT → Decompress → Restore original file
  const handleTxtUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsDecompressing(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressedBase64 = reader.result;
        const compressedBytes = base64ToUint8(compressedBase64);
        const decompressedBytes = await decompress(compressedBytes);
        const blob = new Blob([decompressedBytes]);
        setRestoredBlob(blob);
      } catch (err) {
        setError(err+"Error decompressing file. Maybe wrong TXT format?");
      } finally {
        setIsDecompressing(false);
      }
    };
    reader.readAsText(file);
  };

  // 4. Manual download restored file
  const downloadRestored = () => {
    if (!restoredBlob) return;
    const url = URL.createObjectURL(restoredBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".compressed.txt", "") || "restored_file";
    a.click();
  };

  return (
    <div className="container">
      <div className="app-header">
        <h1>File Compressor</h1>
        <p>Compress files to text and restore them back</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button className="dismiss-btn" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      <div className="panels-container">
        <div className="panel">
          <h2>Compress File</h2>
          <p>Upload a file to compress it into a text format</p>
          
          <input 
            type="file" 
            id="originalFile"
            onChange={handleFileUpload} 
            disabled={isCompressing}
          />
          
          <div className="button-group">
            <button 
              className="btn primary" 
              onClick={downloadTxt} 
              disabled={!compressedText || isCompressing}
            >
              Download Compressed TXT
            </button>
          </div>
          
          {isCompressing && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Compressing file...</span>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Restore File</h2>
          <p>Upload a compressed text file to restore the original file</p>
          
          <input 
            type="file" 
            accept=".txt" 
            onChange={handleTxtUpload} 
            disabled={isDecompressing}
          />
          
          <div className="button-group">
            <button 
              className="btn secondary" 
              onClick={downloadRestored} 
              disabled={!restoredBlob || isDecompressing}
            >
              Download Restored File
            </button>
          </div>
          
          {isDecompressing && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Decompressing file...</span>
            </div>
          )}
        </div>
      </div>

      <div className="app-footer">
        <div className="file-info">
          {fileName && <span>Current file: {fileName}</span>}
        </div>
        <div className="status">
          {compressedText && <span>File compressed successfully</span>}
          {restoredBlob && <span>File ready for restoration</span>}
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 1000px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .app-header {
          padding: 30px;
          text-align: center;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
        }

        .app-header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }

        .app-header p {
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .panels-container {
          display: flex;
          flex-wrap: wrap;
          padding: 20px;
          gap: 20px;
        }

        .panel {
          flex: 1;
          min-width: 450px;
          padding: 25px;
          background: #f9fafc;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .panel h2 {
          margin-bottom: 10px;
          color: #2c3e50;
        }

        .panel p {
          margin-bottom: 20px;
          color: #7f8c8d;
        }

        input[type="file"] {
          width: 100%;
          padding: 12px;
          margin-bottom: 20px;
          border: 2px dashed #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: border-color 0.3s;
        }

        input[type="file"]:hover {
          border-color: #3498db;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #3498db;
          color: white;
        }

        .btn.primary:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-2px);
        }

        .btn.secondary {
          background: #2ecc71;
          color: white;
        }

        .btn.secondary:hover:not(:disabled) {
          background: #27ae60;
          transform: translateY(-2px);
        }

        .btn.outline {
          background: transparent;
          border: 2px solid #e74c3c;
          color: #e74c3c;
        }

        .btn.outline:hover:not(:disabled) {
          background: #e74c3c;
          color: white;
        }

        .app-footer {
          padding: 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message {
          background: #ffecec;
          color: #e74c3c;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dismiss-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #e74c3c;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #7f8c8d;
          margin-top: 15px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive design */
        @media (max-width: 1000px) {
          .panels-container {
            flex-direction: column;
          }
          
          .panel {
            min-width: 100%;
          }
          
          .app-footer {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}