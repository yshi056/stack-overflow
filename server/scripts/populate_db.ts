// Run this script to test your schema
// Start the mongoDB service as a background process before running the script
// Pass URL of your mongoDB instance as first argument(e.g., mongodb://127.0.0.1:27017/fake_so)

import mongoose from "mongoose";

import Answer from "../models/answers";
import Question from "../models/questions";
import Tag from "../models/tags";
import { ITagDB, IAnswerDB, IQuestionDB, ICommentDB } from "./script_types";
import {
  Q1_DESC,
  Q1_TXT,
  Q2_DESC,
  Q2_TXT,
  Q3_DESC,
  Q3_TXT,
  Q4_DESC,
  Q4_TXT,
  A1_TXT,
  A2_TXT,
  A3_TXT,
  A4_TXT,
  A5_TXT,
  A6_TXT,
  A7_TXT,
  A8_TXT,
} from "../data/posts_strings";

// Get arguments passed on command line
const userArgs = process.argv.slice(2);

// Check if user has passed a valid MongoDB URL
if (!userArgs[0].startsWith("mongodb")) {
  console.log(
    "ERROR: You need to specify a valid MongoDB URL as the first argument"
  );
  process.exit(1);
}

// Connect to the MongoDB instance with the URL passed as argument
const mongoDB = userArgs[0];

mongoose.connect(mongoDB);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

/**
 * an asynchronous function to create a tag in the Tags collection of the database
 * @param name tag name
 * @returns a promise that resolves to the tag object created in the database
 */
async function tagCreate(name: string): Promise<ITagDB> {
   const tagDoc = await new Tag({ name }).save();
  
   const tagDB: ITagDB = {
     _id: new mongoose.Types.ObjectId(tagDoc._id),
     name: tagDoc.name
   };
   
   return tagDB;
}

/**
 * an asynchronous function to create an answer in the Answers collection of the database
 * @param text answer text
 * @param ans_by username of the user who answered the question
 * @param ans_date_time date and time when the answer was posted
 * @returns a promise that resolves to the answer object created in the database
 */
function answerCreate(
  qid: mongoose.Types.ObjectId,
  text: string,
  ans_by: string,
  ans_date_time: Date
): Promise<IAnswerDB> {
  const answerDetail: IAnswerDB = {
    qid,
    text,
    ans_by,
    ans_date_time,
    comments: [],
    upVotes: [],
    downVotes: []
  };

  const answer = new Answer(answerDetail);
  return answer.save();
}

/**
 * an asynchronous function to create a question in the Questions collection of the database
 * @param title question title
 * @param text question text
 * @param tags an array of tag objects
 * @param answers an array of answer objects
 * @param asked_by username of the user who asked the question
 * @param ask_date_time date and time when the question was posted
 * @param views number of views on the question
 * @returns a promise that resolves to the question object created in the database
 */
function questionCreate(
  title: string,
  text: string,
  tags: ITagDB[],
  answers: IAnswerDB[],
  asked_by: string,
  ask_date_time: Date,
  views: number
): Promise<IQuestionDB> {
  const qstnDetail: IQuestionDB = {
    title,
    text,
    tags,
    answers,
    asked_by,
    ask_date_time,
    views,
  };
  if (ask_date_time) qstnDetail.ask_date_time = ask_date_time;
  if (views) qstnDetail.views = views;

  const qstn = new Question(qstnDetail);
  return qstn.save();
}


console.log("processing ...");
