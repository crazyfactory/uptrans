import { Octokit } from "@octokit/rest";

interface ICreatePrOptions {
  branch: string;
  title: string;
  body: string;
  version: string;
}

export class UpdateLanguageFile {
  private github: Octokit;

  constructor(private owner: string, private repo: string, token: string) {
    this.github = new Octokit({
      auth: token,
      userAgent: "uptrans",
    });
  }

  public async createTranslationUpdatePr(
    options: ICreatePrOptions
  ): Promise<any> {
    console.info("creating a new branch: ", options.branch);
    const branch = await this.createBranch(options.branch);

    console.info("creating translation update marker file...");
    await this.createTranslationMarkerFile(options.branch, options.version);

    console.info("creating pull request");
    return await this.createPullRequest(
      options.title,
      options.body,
      branch.replace("refs/heads/", "")
    );
  }

  private async createPullRequest(
    title: string,
    body: string,
    branch: string
  ): Promise<any> {
    console.info(title, body, branch);
    return await this.github.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      base: "master",
      head: `${branch}`,
    });
  }

  private async createBranch(name: string): Promise<string> {
    const sha = await this.getShaForMaster();
    try {
      const data = await this.github.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${name}`,
        sha,
      });
      return data.data.ref;
    } catch (e: any) {
      const error = (e.response && e.response.data) || {};
      if (error.message === "Reference already exists") {
        console.info("reference already exists, using same reference");
        return `refs/heads/${name}`;
      }
      throw e;
    }
  }

  private async getShaForMaster(): Promise<string> {
    const ref = await this.github.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: "heads/master",
    });
    return ref.data.object.sha;
  }

  private async createTranslationMarkerFile(
    branch: string,
    version: string
  ): Promise<void> {
    const markerContent = `Translation update for version ${version}\nDate: ${new Date().toISOString()}\n`;
    const encodedContent = Buffer.from(markerContent).toString("base64");

    const fileParams: any = {
      owner: this.owner,
      repo: this.repo,
      path: ".translation-update",
      message: `chore: translation update for ${version}`,
      content: encodedContent,
      branch,
    };

    await this.github.rest.repos.createOrUpdateFileContents(fileParams);
  }
}
