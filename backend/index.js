const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { PDFParse } = require('pdf-parse')
const Groq = require('groq-sdk')


const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

app.get('/', (req, res) => {
  res.send('Backend server is running!')
})

app.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    const parser = new PDFParse({ data: req.file.buffer })
    const pdfData = await parser.getText()
    const resumeText = pdfData.text
    const jobDescription = req.body.jobDescription || ''

    const hasJD = jobDescription.trim().length > 0

    const promptText = hasJD
      ? `তুমি একজন expert resume reviewer। এই resume টা এবং job description টা compare করে analyze করো। শুধুমাত্র নিচের JSON format এ উত্তর দাও, অন্য কোনো লেখা ছাড়া, কোনো markdown backtick ছাড়া:

{
  "score": <0 theke 100 er modhe overall resume quality score>,
  "matchScore": <0 theke 100 er modhe, resume ta job description er sathe koto match kore>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "missingKeywords": ["keyword 1", "keyword 2", "keyword 3"]
}

Resume:
${resumeText}

Job Description:
${jobDescription}`
      : `তুমি একজন expert resume reviewer। এই resume টা analyze করো এবং শুধুমাত্র নিচের JSON format এ উত্তর দাও, অন্য কোনো লেখা ছাড়া, কোনো markdown backtick ছাড়া:

{
  "score": <0 theke 100 er modhe ekta number>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}

Resume:
${resumeText}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
    })

    const responseText = completion.choices[0].message.content
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const analysisResult = JSON.parse(jsonMatch[0])

    res.json(analysisResult)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Something went wrong analyzing the resume' })
  }
})

const PORT = 5050
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})