import mongoose from "mongoose";
import { ITag, ITagDocument, ITagModel } from "../../types/types";

/**
 * The schema for a document in the Tags collection.
 * 
 * The schema is created using the constructor in mongoose.Schema class.
 * The schema is defined with two generic parameters: ITagDocument and ITagModel.
 * ITagDocument is used to define the instance methods of the Tag document.
 * ITagModel is used to define the static methods of the Tag model.
 */

const TagSchema = new mongoose.Schema<ITagDocument, ITagModel>(
  {
    name: {type: String, required: true}
  },
  { collection: "Tag" }
);

/**
 * The static method to find or create multiple tags.
 */
TagSchema.statics.findOrCreateMany = async function (tags: string[]): Promise<ITag[]> {
  const tagArr = [];
  for (const tag of tags) {
    const result = await this.findOne({ name: tag });
    if (!result) {
        const newTag = await this.create({ name: tag });
        tagArr.push({ _id: newTag._id.toString(), name: newTag.name });
    } else {
        tagArr.push({ _id: result._id.toString(), name: result.name });
    }
  }
  return tagArr;
};

/** 
 * An async method that validates if all provided tag IDs exist in the database
 * @param tagIds An array of tag ids
 * @returns A boolean indicating whether all provided tag IDs exist
 */
TagSchema.statics.validateTags = async function (tagIds: string[]): Promise<boolean> {
  // Count how many of the provided tag IDs actually exist in the database
  const validTagsCount = await this.countDocuments({
    _id: { $in: tagIds.map(id => new mongoose.Types.ObjectId(id)) }
  });
  
  // Return true if all provided tag IDs were found
  return validTagsCount === tagIds.length;
};

export default TagSchema;
