const cron = require("node-cron");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./calaisite-firebase-adminsdk-jzdol-cbf936ef3d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://calaisite-default-rtdb.firebaseio.com",
});

const db = admin.firestore();

const logCollectionNames = async () => {
  try {
    const collections = await db.listCollections();
    const collectionNames = collections.map((collection) => collection.id);
    console.log("Collections in Firestore:", collectionNames);
  } catch (error) {
    console.error("Error fetching collection names:", error);
  }
};

const fetchEmails = async () => {
  try {
    const beforeSnapshot = await db.collection("before_transaction").get();

    if (beforeSnapshot.empty) {
      console.log("No documents found in 'before_transaction' collection.");
      return;
    }

    // console.log("Documents in 'before_transaction' collection:");
    // beforeSnapshot.forEach((doc) => {
    //   console.log(doc.id, "=>", doc.data());
    // });

    const afterSnapshot = await db.collection("after_transaction").get();

    if (afterSnapshot.empty) {
      console.log("No documents found in 'after_transaction' collection.");
      return;
    }
    // console.log("Documents in 'after_transaction' collection:");
    // afterSnapshot.forEach((doc) => {
    //   console.log(doc.id, "=>", doc.data());
    // });

    const beforeEmails = beforeSnapshot.docs.map((doc) => doc.id);
    const afterEmails = afterSnapshot.docs.map((doc) => doc.id);

    const emailsNotInAfter = beforeEmails.filter(
      (email) => !afterEmails.includes(email)
    );

    if (emailsNotInAfter.length > 0) {
      console.log(
        "Emails present in before_transaction but not in after_transaction:",
        emailsNotInAfter
      );
    } else {
      console.log(
        "All emails in before_transaction are present in after_transaction"
      );
    }
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
};

// Schedule the task to run every minute
cron.schedule("* * * * *", () => {
  console.log("Running the email check task");
  fetchEmails();
});

console.log("Email check scheduler is running");
