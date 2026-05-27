const taskRoutes = require("express").Router();
const dataModel = require("../Models/DataModel");

taskRoutes.get("/getTask", async (req, res) => {
  try {
    const { _id } = req.user;
    const newTask = new dataModel({
      _id: _id,
    });
    let task = await dataModel.findById(_id);
    if (!task) task = await newTask.save();
    console.log(task.tasks);
    res.json(task.tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

taskRoutes.post("/postTask", async (req, res) => {
  try {
    const { _id } = req.user;
    const newTask = req.body;
    
    // Generate a unique ID if not provided
    if (!newTask.id) {
      newTask.id = Date.now().toString();
    }
    
    // Set default done status if not provided
    if (newTask.done === undefined) {
      newTask.done = false;
    }
    
    await dataModel
      .findByIdAndUpdate({ _id: _id }, { $push: { tasks: newTask } })
      .catch((err) => {
        console.log(err);
      });
    
    res.json({ success: "Posted Successfully", id: newTask.id });
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Failed to add task" });
  }
});

taskRoutes.patch("/updateTask/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Create an update object dynamically based on provided fields
    const updateObj = {};
    Object.keys(updates).forEach(key => {
      updateObj[`tasks.$.${key}`] = updates[key];
    });
    
    await dataModel
      .findOneAndUpdate(
        { "tasks.id": id },
        { $set: updateObj },
        { new: true }
      )
      .catch((err) => {
        console.log(err);
      });
    
    res.json({ success: "Updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

taskRoutes.delete("/deleteTask/:id", async (req, res) => {
  try {
    const { _id } = req.user;
    const { id } = req.params;
    await dataModel
      .findByIdAndUpdate(_id, { $pull: { tasks: { id: id } } })
      .catch((err) => {
        console.log(err);
      });
    res.json({ success: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = taskRoutes;
