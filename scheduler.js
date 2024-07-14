const cron = require("node-cron");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin SDK
const serviceAccount = require("./calaisite-firebase-adminsdk-jzdol-cbf936ef3d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://calaisite-default-rtdb.firebaseio.com",
});

const db = admin.firestore();

const apiKey = process.env.BREVO_API_KEY // Replace with your Brevo API key

const checkAndDeleteEmail = async (email) => {
  try {
    // Check if the email exists
    const checkResponse = await axios.get(
      `https://api.brevo.com/v3/contacts/${email}`,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
      }
    );

    // If the email exists, delete it
    if (checkResponse.status === 200) {
      await axios.delete(`https://api.brevo.com/v3/contacts/${email}`, {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
      });
      console.log(`Email ${email} deleted from Brevo list.`);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`Email ${email} not found in Brevo list.`);
    } else {
      console.error(`Error checking/deleting email ${email}:`, error);
    }
  }
};

const addEmailsToBrevoList = async (emails, listId) => {
  try {
    const promises = emails.map(async (email) => {
      try {
        // Check and delete email if it exists
        await checkAndDeleteEmail(email);

        // Add the email to the Brevo list
        const response = await axios.post(
          "https://api.brevo.com/v3/contacts",
          {
            email: email,
            listIds: [listId],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
          }
        );
        console.log(`Email ${email} added with response:`, response.data);
      } catch (error) {
        console.error(`Error adding email ${email}:`, error);
      }
    });

    await Promise.all(promises);
    console.log("All emails processed.");
  } catch (error) {
    console.error("Error processing emails:", error);
  }
};

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

    const afterSnapshot = await db.collection("after_transaction").get();

    if (afterSnapshot.empty) {
      console.log("No documents found in 'after_transaction' collection.");
      return;
    }

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

const fetchLoginBeforeApplyEmails = async () => {
  try {
    const snapshot = await db.collection("login_before_apply").get();

    if (snapshot.empty) {
      console.log("No documents found in 'login_before_apply' collection.");
      return;
    }

    const emails = snapshot.docs.map((doc) => doc.id);
    console.log("Emails in 'login_before_apply' collection:", emails);

    // Add emails to Brevo list
    await addEmailsToBrevoList(emails, 109);
  } catch (error) {
    console.error("Error fetching emails from 'login_before_apply':", error);
  }
};

const fetchApplyBeforeLoginEmails = async () => {
  try {
    const snapshot = await db.collection("apply_before_login").get();

    if (snapshot.empty) {
      console.log("No documents found in 'apply_before_login' collection.");
      return;
    }

    const emails = snapshot.docs.map((doc) => doc.id);
    console.log("Emails in 'apply_before_login' collection:", emails);

    // Add emails to Brevo list
    await addEmailsToBrevoList(emails, 108);
  } catch (error) {
    console.error("Error fetching emails from 'apply_before_login':", error);
  }
};

// Schedule the task to run every 12 hours
cron.schedule("0 */12 * * *", () => {
  console.log("Running the email check task");
  fetchEmails();
  fetchLoginBeforeApplyEmails();
  fetchApplyBeforeLoginEmails();
});

console.log("Email check scheduler is running");
