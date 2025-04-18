import mongoose from "mongoose";
import { IAnswer, IAnswerDocument, IComment, IQuestion, IQuestionDocument, IQuestionModel, ICommentDocument } from "../../types/types";
import "../tags"
import Answer from "../answers"; // Adjust the path as necessary
/**
 * The schema for a document in the Question collection.
 * 
 * title: String
 * text: String
 * asked_by: String
 * ask_date_time: Date
 * view: Number {default: 0}
 * answers: an array of Answer objects
 * tags: an array of Tag objects
 *
 * The schema is created using the constructor in mongoose.Schema class.
 * The schema is defined with two generic parameters: IQuestionDocument and IQuestionModel.
 * IQQuestionDocument is used to define the instance methods of the Question document.
 * IQuestionModel is used to define the static methods of the Question model.
*/
const QuestionSchema = new mongoose.Schema<IQuestionDocument, IQuestionModel>(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    asked_by: { type: String, required: true },
    ask_date_time: { type: Date, required: true },
    views: { type: Number, default: 0 },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Answer" }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }]
  },
  { collection: "Question" }
);

QuestionSchema.virtual("id").get(function (this: IQuestionDocument) {
  return this._id.toHexString();
});
QuestionSchema.set("toJSON", { 
  virtuals: true,
  transform: (doc, ret) => {
    // Optionally remove _id and __v if you don't want them in your output.
    ret._id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

/**
 * Returns the questions sorted by the date they were asked, where the latest questions are shown first.
 * @returns An array of IQuestion objects
 */
QuestionSchema.statics.getNewestQuestions = async function (): Promise<IQuestion[]> {
  const docs = await this.find().sort({ ask_date_time: -1 }).populate("answers").populate("tags").exec();
  return docs.map(convertToIQuestion);
};

/**
 * Returns the questions unanswered in newest order
 * @returns An array of IQuestion objects
 */
QuestionSchema.statics.getUnansweredQuestions = async function (): Promise<IQuestion[]> {
  const docs = await this.find({ answers: { $size: 0 } }).sort({ ask_date_time: -1 }).populate("answers").populate("tags").exec();
  return docs.map(convertToIQuestion);
};

/**
 * Returns the questions sorted by latest answered order, where those answered first are shown first.
 * For questions not answered, they should be shown last and sorted by the date they were asked.
 * @returns   An array of IQuestion objects
 */
QuestionSchema.statics.getActiveQuestions = async function (): Promise<IQuestion[]> {
  const questions = await this.find().populate("answers").populate("tags").exec();
  const questionsWithActivity = await getQuestionsWithMostRecentActivity(questions);
  const { questionsWithAnswers, questionsWithoutAnswers } = separateQuestionsByActivity(questionsWithActivity);
  const sortedQuestionsWithAnswers = sortQuestionsByActivity(questionsWithAnswers);
  const sortedQuestionsWithoutAnswers = sortQuestionsByActivity(questionsWithoutAnswers);
  const sortedQuestions = [...sortedQuestionsWithAnswers, ...sortedQuestionsWithoutAnswers];
  return sortedQuestions.map(item => convertToIQuestion(item.question));
};

/**
 * Returns a question by its ID and increments the views by 1.
 * @param qid The ID of the question
 * @returns An IQuestion object
 */
QuestionSchema.statics.findByIdAndIncrementViews = async function (qid: string): Promise<IQuestion | null> {
  const objectId = new mongoose.Types.ObjectId(qid);
  const doc = await this.findByIdAndUpdate(objectId, { $inc: { views: 1 } }, { new: true }).populate({
    path: "answers",
    options: { sort: { ans_date_time: -1 } }
  }).populate("tags")
  .exec();

  console.log(doc?.id);
  return doc ? convertToIQuestion(doc) : null;
};

/**
 * Returns the number of questions associated with a tag.
 * @param tagId The ID of the tag
 * @returns The number of questions associated with the tag
 */
QuestionSchema.statics.numberByTag = async function (tagId: string): Promise<number> {
  const objectId = new mongoose.Types.ObjectId(tagId);
  const docs = await this.find({ tags: objectId }).exec();
  return docs.length;
};
/**
 * Returns the count of questions associated with each tag.
 * @returns An array of objects containing tagId, name, and qcnt
 */
QuestionSchema.statics.getQuestionCountByTag = async function (): Promise<{ /*tagId: string,*/ name: string, qcnt: number }[]> {
  const result = await this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", qcnt: { $sum: 1 } } },
    {
      $lookup: {
        from: "Tag",
        localField: "_id",
        foreignField: "_id",
        as: "tag"
      }
    },
    { $unwind: "$tag" },
    {
      $project: {
        _id: 0,
        tagId: "$_id",
        name: "$tag.name",
        qcnt: 1
      }
    }
  ]).exec();

  return result.map(item => ({
    //tagId: item.tagId.toString(),
    name: item.name,
    qcnt: item.qcnt
  }));
};

/**
 * Increments the views of a question by 1.
 * @returns The updated IQuestionDocument object
 */
QuestionSchema.methods.incrementViews = async function (): Promise<IQuestionDocument> {
  this.views++;
  return this.save();
};

/**
 * Adds an answer to a question.
 * @param answerId The ID of the answer
 * @returns The updated IQuestionDocument object
 */
QuestionSchema.methods.addAnswer = async function (
  answerId: mongoose.Types.ObjectId
): Promise<IQuestionDocument> {
  this.answers.push(answerId);
  if (this.answers.length > 0) {
    this.hasAnswers = true;
  }
  return this.save();
};

/**
 * Helper that converts a IQuestionDocument object to an IQuestion object.
 * @param doc An IQuestionDocument object
 * @returns An IQuestion object
 */
export const convertToIQuestion = (doc: IQuestionDocument): IQuestion => {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    text: doc.text,
    asked_by: doc.asked_by,
    ask_date_time: doc.ask_date_time.toISOString(), // Ensure date-time format
    views: doc.views,
    answers: doc.answers.map(answer => {
      if (answer instanceof mongoose.Types.ObjectId) {
        //const answerDoc = Answer.findById(answer).exec();
        return { _id: answer.toString() } as IAnswer; // Assuming minimal IAnswer structure
      } else {
        return convertToIAnswer(answer as IAnswerDocument);
      }
    }),
    tags: doc.tags.map(tag => ({
      _id: tag._id?.toString(),
      name: tag.name
    }))
  };
};

/**
 * Helper that converts a IAnswerDocument object to an IAnswer object.
 * @param doc An IAnswerDocument object
 * @returns An IAnswer object
 */
export const convertToIAnswer = (doc: IAnswerDocument): IAnswer => {
  return {
  _id: doc._id?.toString(),
  qid: doc.qid.toString(),
  text: doc.text,
  ans_by: doc.ans_by,
  ans_date_time: doc.ans_date_time.toISOString(), // Ensure date-time format
  comments: doc.comments.map(comment => {
    if (comment instanceof mongoose.Types.ObjectId) {
      //const answerDoc = Answer.findById(answer).exec();
      return { _id: comment.toString() } as IComment; // Assuming minimal IAnswer structure
    } else {
      return convertToIComment(comment as ICommentDocument);
    }
  }),
  upVotes: doc.upVotes,
  downVotes: doc.downVotes,
  // Include question title if qid is populated
  questionTitle: doc.qid && typeof doc.qid === 'object' && 'title' in doc.qid ? (doc.qid.title as string) : undefined
};
};

export const convertToIComment = (doc: ICommentDocument) => {
  return {
    _id: doc._id.toString(),
    text: doc.text,
    user: doc.user,
    comment_date_time: doc.comment_date_time.toISOString() // Ensure date-time format
  };
}

/**
 * Helper that returns an array of questions with the most recent activity date.
 * @param questions An array of IQuestionDocument objects
 * @returns An array of objects with the question and the most recent activity date
 */
const getQuestionsWithMostRecentActivity = async (questions: IQuestionDocument[]) => {
  return Promise.all(questions.map(async (q: IQuestionDocument) => {
    const latestAnswerDate = await Answer.getLatestAnswerDate(q.answers);
    const mostRecent = latestAnswerDate ? latestAnswerDate : q.ask_date_time;
    return { question: q, mostRecentActivity: mostRecent };
  }));
};

/**
 * Helper that separates questions with answers from questions without answers.
 * @param questionsWithActivity An array of objects with the question and the most recent activity date
 * @returns An object with two arrays: questionsWithAnswers and questionsWithoutAnswers
 * where questionsWithAnswers are questions that have answers and questionsWithoutAnswers are questions without answers
 * sorted by the most recent activity date
 */
const separateQuestionsByActivity = (questionsWithActivity: { question: IQuestionDocument, mostRecentActivity: Date }[]) => {
  const questionsWithAnswers = questionsWithActivity.filter(item => item.mostRecentActivity !== item.question.ask_date_time);
  const questionsWithoutAnswers = questionsWithActivity.filter(item => item.mostRecentActivity === item.question.ask_date_time);
  return { questionsWithAnswers, questionsWithoutAnswers };
};

/**
 * Helper that sorts questions by the most recent activity date.
 * @param questions An array of objects with the question and the most recent activity date
 * @returns An array of objects with the question and the most recent activity date sorted by the most recent activity date
 * where those answered first are shown first
 */
const sortQuestionsByActivity = (questions: { question: IQuestionDocument, mostRecentActivity: Date }[]) => {
  return questions.sort((a, b) => b.mostRecentActivity.getTime() - a.mostRecentActivity.getTime());
};

export default QuestionSchema;
