import requestly from "requestly";
import { BASE_URL } from "./config";

export interface SMSOfficeOptions {
  apiKey?: string;
  sender?: string;
}

export interface SendOptions {
  urgent?: boolean;
  scheduledAt?: Date;
}

export interface SMSOfficeResponse<T = unknown> {
  Success: boolean;
  Message: string;
  Output: T;
  ErrorCode: number;
}

export class SMSOffice {
  protected _requests = requestly.create({
    baseUrl: BASE_URL,
    userAgent: `SMSOffice-SDK/0.0.1`,
  });

  private apiKey?: string = process.env.SMSOFFICE_API_KEY;
  private sender?: string = process.env.SMSOFFICE_SENDER;

  constructor(options?: SMSOfficeOptions) {
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    }

    if (options?.sender) {
      this.sender = options.sender;
    }
  }

  private _encodeQuery(
    url: string,
    query: Record<string, string | number | boolean>
  ) {
    const hasQuery = url.includes("?");
    const queryString = Object.entries(query)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join("&");

    return `${url}${hasQuery ? "&" : "?"}${queryString}`;
  }

  private _formatDestination(destination: string): string {
    destination = destination.trim().replace("+", "");

    return destination;
  }

  public async send(
    destination: string | string[],
    content: string,
    options: SendOptions = {}
  ) {
    if (!this.apiKey || !this.sender) {
      throw new Error("API key and sender are required.");
    }

    let URL = this._encodeQuery("/api/v2/send", {
      key: this.apiKey,
      sender: this.sender,
    });

    if (typeof destination === "string") {
      destination = this._formatDestination(destination);
    }

    if (Array.isArray(destination)) {
      destination = destination.map(this._formatDestination).join(",");
    }

    if (destination.trim().length === 0) {
      throw new Error("Destination should not be empty.");
    }

    if (content.trim().length === 0 || content.length > 1000) {
      throw new Error(
        "Content should not be empty and should be less than 1000 characters."
      );
    }

    if (options.urgent) {
      URL = this._encodeQuery(URL, {
        urgent: true,
      });
    }

    if (options.scheduledAt) {
      if (options.scheduledAt) {
        const unixTimestamp = Math.floor(options.scheduledAt.getTime() / 1000);
        URL = this._encodeQuery(URL, {
          scheduledAt: unixTimestamp,
        });
      }
    }

    return this._requests.get<SMSOfficeResponse>(
      this._encodeQuery(URL, {
        destination,
        content,
      })
    );
  }

  public async balance(): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API key is required.");
    }

    try {
      return await this._requests
        .get<string>(
          this._encodeQuery("/api/getBalance", {
            key: this.apiKey,
          })
        )
        .then((r) => r.data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
