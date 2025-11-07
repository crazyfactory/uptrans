import { Octokit } from "@octokit/rest"; // tslint:disable-line

interface IUpdateFileOptions {
  content: string;
  branch: string;
  message: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  filePath: string;
}

interface IFileInfo {
  content: string;
  sha: string;
}

export class UpdateLanguageFile {
  private github: Octokit;

  constructor(private owner: string, private repo: string, token: string) {
    this.github = new Octokit({
      auth: token,
      userAgent: "uptrans",
    });
  }

  public async createFileAndPr(newContent: IUpdateFileOptions): Promise<any> {
    console.info("getting content from file");
    const content = await this.getContentFromFile(newContent.filePath);
    console.info("creating a new branch: ", newContent.branch);
    const branch = await this.createBranch(newContent.branch);
    console.info("pushing new file...");
    await this.github.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: newContent.filePath,
      message: newContent.message,
      content: Buffer.from(newContent.content).toString("base64"),
      sha: content.sha,
      branch,
    });
    console.info("creating new pull request");
    return await this.createPullRequest(
      newContent.pullRequestTitle,
      newContent.pullRequestBody,
      branch.replace("refs/heads/", "")
    );
  }

  private async createPullRequest(
    title: string,
    body: string,
    branch: string
  ): Promise<any> {
    console.info(title, body, branch, `${this.repo}:${branch}`);
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

  private async getContentFromFile(file: string): Promise<IFileInfo> {
    const data = await this.github.rest.repos.getContent({
      owner: this.owner,
      path: file,
      repo: this.repo,
    });
    return {
      content: (data.data as any).content,
      sha: (data.data as any).sha,
    };
  }
}
