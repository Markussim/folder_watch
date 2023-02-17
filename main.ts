import * as fs from "fs";
import * as chokidar from "chokidar";
import * as path from "path";
import { Storage } from "@google-cloud/storage";
// Configure dotenv to load environment variables from .env file
import * as dotenv from "dotenv";
dotenv.config();

// Load the service account key file
const keyFile = "./key.json";
const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));

// Google Cloud Storage configuration
const storage = new Storage({ projectId: key.project_id, credentials: key });
const bucketName = process.env.BUCKET_NAME || "files";
const bucket = storage.bucket(bucketName);

// Local folder to watch for new files
const folderPath = process.env.FOLDER_PATH || "./files";

// Set of files that have already been uploaded to the bucket
const uploadedFiles = new Set<string>();

// Process all existing files in the folder
fs.readdir(folderPath, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    processFile(filePath);
  }
});

// Watch the folder for new files
chokidar
  .watch(folderPath)
  .on("add", (filePath) => {
    processFile(filePath);
  })
  .on("change", (filePath) => {
    processFile(filePath);
  });

async function processFile(filePath: string) {
  if (uploadedFiles.has(filePath)) {
    // The file has already been uploaded
    console.log(`Skipping file ${filePath} - already uploaded to bucket`);
    return;
  }

  console.log(`Processing file: ${filePath}`);

  try {
    // Upload the file to the bucket
    const file = await bucket.upload(filePath);

    // Add the file to the set of uploaded files
    uploadedFiles.add(filePath);

    console.log(`File ${filePath} uploaded to bucket ${bucketName}`);
  } catch (err) {
    console.error(`Error uploading file ${filePath}:`, err);
  }
}
