import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import './App.css'

function App() {
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('resumeHistory')
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  const saveToHistory = (data, fileName) => {
    const entry = {
      id: Date.now(),
      fileName,
      score: data.score,
      matchScore: data.matchScore,
      date: new Date().toLocaleString('bn-BD'),
      data,
    }
    const updated = [entry, ...history].slice(0, 10)
    setHistory(updated)
    localStorage.setItem('resumeHistory', JSON.stringify(updated))
  }

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0])
    setResult(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('আগে একটা PDF resume সিলেক্ট করো')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('jobDescription', jobDescription)

    try {
      const response = await fetch('https://resume-analyzer-backend-riev.onrender.com/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Server error')
      }

      const data = await response.json()
      setResult(data)
      saveToHistory(data, resumeFile.name)
    } catch (err) {
      setError('কিছু একটা সমস্যা হয়েছে, আবার try করো')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = () => {
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(20)
    doc.text('AI Resume Analyzer - Report', 20, y)
    y += 15

    doc.setFontSize(14)
    doc.text(`Resume Score: ${result.score}/100`, 20, y)
    y += 8
    if (result.matchScore !== undefined) {
      doc.text(`Job Match: ${result.matchScore}%`, 20, y)
      y += 8
    }
    y += 8

    const addSection = (title, items) => {
      doc.setFontSize(13)
      doc.text(title, 20, y)
      y += 8
      doc.setFontSize(11)
      items.forEach((item) => {
        const lines = doc.splitTextToSize(`- ${item}`, 170)
        doc.text(lines, 20, y)
        y += lines.length * 6
      })
      y += 6
    }

    addSection('Strengths', result.strengths)
    addSection('Weaknesses', result.weaknesses)
    addSection('Suggestions', result.suggestions)
    if (result.missingKeywords && result.missingKeywords.length > 0) {
      addSection('Missing Keywords', result.missingKeywords)
    }

    doc.save('resume-analysis-report.pdf')
  }

  const loadFromHistory = (entry) => {
    setResult(entry.data)
    setShowHistory(false)
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('resumeHistory')
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="container">
      <header className="fade-in">
        <div className="header-top">
          <h1>AI Resume Analyzer</h1>
          {history.length > 0 && (
            <button
              className="history-toggle-btn"
              onClick={() => setShowHistory(!showHistory)}
            >
              📜 History ({history.length})
            </button>
          )}
        </div>
        <p>তোমার resume আপলোড করো, AI দিয়ে instant feedback পাও</p>
      </header>

      <main>
        {showHistory && (
          <div className="history-box fade-in">
            <div className="history-header">
              <h3>আগের Analysis গুলো</h3>
              <button className="clear-history-btn" onClick={clearHistory}>
                Clear All
              </button>
            </div>
            {history.map((entry) => (
              <div
                key={entry.id}
                className="history-item"
                onClick={() => loadFromHistory(entry)}
              >
                <div>
                  <p className="history-filename">📄 {entry.fileName}</p>
                  <p className="history-date">{entry.date}</p>
                </div>
                <div
                  className="history-score"
                  style={{ color: getScoreColor(entry.score) }}
                >
                  {entry.score}/100
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="upload-box fade-in">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            id="resume-upload"
          />
          <label htmlFor="resume-upload">
            {resumeFile ? `📄 ${resumeFile.name}` : 'Resume (PDF) সিলেক্ট করো'}
          </label>

          <textarea
            className="jd-textarea"
            placeholder="Job Description এখানে paste করো (optional) — এতে AI resume আর job এর মধ্যে match score ও দেখাবে"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
          />

          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                Analyzing...
              </span>
            ) : (
              'Analyze Resume'
            )}
          </button>
        </div>

        {error && <p className="error-text fade-in">{error}</p>}

        {loading && (
          <div className="loading-box fade-in">
            <div className="pulse-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>AI তোমার resume পড়ছে...</p>
          </div>
        )}

        {result && !loading && (
          <div className="result-box fade-in">
            <div className="score-row">
              <div className="score-section">
                <div
                  className="score-circle"
                  style={{
                    background: `conic-gradient(${getScoreColor(
                      result.score
                    )} ${result.score * 3.6}deg, #26262e 0deg)`,
                  }}
                >
                  <div className="score-inner">
                    <span className="score-number">{result.score}</span>
                    <span className="score-label">Resume Score</span>
                  </div>
                </div>
              </div>

              {result.matchScore !== undefined && (
                <div className="score-section">
                  <div
                    className="score-circle"
                    style={{
                      background: `conic-gradient(${getScoreColor(
                        result.matchScore
                      )} ${result.matchScore * 3.6}deg, #26262e 0deg)`,
                    }}
                  >
                    <div className="score-inner">
                      <span className="score-number">{result.matchScore}%</span>
                      <span className="score-label">Job Match</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h3>✅ Strengths</h3>
            <ul>
              {result.strengths.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3>⚠️ Weaknesses</h3>
            <ul>
              {result.weaknesses.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3>💡 Suggestions</h3>
            <ul>
              {result.suggestions.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            {result.missingKeywords && result.missingKeywords.length > 0 && (
              <>
                <h3>🔑 Missing Keywords (Job Description থেকে)</h3>
                <ul>
                  {result.missingKeywords.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            <button className="download-btn" onClick={handleDownloadReport}>
              📥 Download Report (PDF)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App