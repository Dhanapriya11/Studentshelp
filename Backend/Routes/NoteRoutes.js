const noteRoutes = require("express").Router();
const dataModel = require("../Models/DataModel");
const axios = require("axios");

noteRoutes.get("/getNote", async (req, res) => {
  const { _id } = req.user;
  const newNote = new dataModel({
    _id: _id,
  });
  let note = await dataModel.findById(_id);
  if (!note) note = await newNote.save();
  console.log(note.notes);
  res.json(note.notes);
});

noteRoutes.post("/postNote", async (req, res) => {
  const { _id } = req.user;
  const note = req.body;
  await dataModel
    .findByIdAndUpdate({ _id: _id }, { $push: { notes: note } })
    .catch((err) => {
      console.log(err);
    });
  res.json({ success: "Posted Successfully" });
});

noteRoutes.patch("/updateNote/:id", async (req, res) => {
  const { id } = req.params;
  const { newText } = req.body;
  await dataModel
    .findOneAndUpdate(
      { "notes.id": id },
      {
        $set: {
          "notes.$.noteText": newText,
        },
      },
      { new: true }
    )
    .catch((err) => {
      console.log(err);
    });
  res.json({ success: "Updated successfully" });
});

noteRoutes.delete("/deleteNote/:id", async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  await dataModel
    .findByIdAndUpdate(_id, { $pull: { notes: { id: id } } })
    .catch((err) => {
      console.log(err);
    });
  res.json({ success: "Deleted successfully" });
});

// Analyze content using AI
noteRoutes.post("/analyze", async (req, res) => {
  try {
    const { content, fileName } = req.body;
    
    const prompt = `I have uploaded a file named "${fileName}". Here is the content:\n\n${content.substring(0, 3000)}${content.length > 3000 ? '...(content truncated)' : ''}\n\nPlease analyze this content.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({ analysis: response.data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

// Chat with AI
noteRoutes.post("/chat", async (req, res) => {
  try {
    const { message, fileContent } = req.body;
    
    let prompt = message;
    
    if (fileContent) {
      prompt = `File content:\n${fileContent.substring(0, 2000)}\n\nUser question: ${message}`;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({ reply: response.data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

module.exports = noteRoutes;
