import { UpdateLanguageFile } from "./UpdateLanguageFile";

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1oV9odTAVYUVMsX5vqM62hAZ7XdFeTGly5ikfVyM_qIo/";

async function createTranslationUpdateRequest(
  projectName: string = "",
  version: string = ""
): Promise<void> {
  if (!projectName || projectName === "") {
    console.error("PROJECT_NAME environment variable not set");
    return;
  }

  if (!version || version === "") {
    console.info("Not running on non tag build");
    return;
  }

  if (!process.env.GH_TOKEN) {
    console.error("GH_TOKEN not set");
    return;
  }

  // Get the repository owner and name from environment or use defaults
  const repoOwner = process.env.REPO_OWNER || "crazyfactory";
  const repoName = process.env.REPO_NAME || "shop";

  const language = new UpdateLanguageFile(
    repoOwner,
    repoName,
    process.env.GH_TOKEN
  );

  const prTitle = `Translation update for ${projectName} v${version}`;
  const prDescription = `**Translation update required for version ${version}**

Please update the translation reference in the following Google Sheet:

[Translation Reference Spreadsheet](${GOOGLE_SHEETS_URL})

---
*This is an automated notification created by uptrans*`;

  try {
    const result = await language.createTranslationUpdatePr({
      branch: `translation-update/${projectName}/${version}`,
      title: prTitle,
      body: prDescription,
      version,
    });

    console.info("PR created: ", result.data.html_url);
  } catch (e) {
    console.error("Failed to create translation update PR:", e);
    throw e;
  }
}

createTranslationUpdateRequest(
  process.env.PROJECT_NAME,
  process.env.TRAVIS_TAG
).catch((e) => {
  console.error(e);
  process.exit(1);
});
