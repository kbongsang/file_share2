// import express from "express";
// import { seed, seedFunctions } from "./service";

// const router = express.Router();

// router.get("/", (req, res) => {
//   seed();
//   res.send("Hello, world!");
// });

// router.post("/", (req, res) => {
//   console.log("Request: ", req.body);

//   if (req.body.type === "FUNCTION") {
//     try {
//       const receivedFunction = eval(req.body.data);

//       if (typeof receivedFunction !== "function") {
//         console.error("Is not a function.");
//       } else {
//         console.log("Server: Valid function.");
//       }

//       seedFunctions.push(receivedFunction);
//       res.send({ message: "Your request has been received.", data: req.body });
//       // Use the receivedFunction as needed
//     } catch (error) {
//       console.error("Error evaluating function:", error);
//       res.status(400).send({ message: "Invalid function provided." });
//       return;
//     }
//   } else {
//     res.status(406).send({ message: "Is not a function.", data: req.body });
//   }

//   seed();
// });

// export { router as geneticRouter };
