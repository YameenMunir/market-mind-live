import type { StatusTone } from "@/components/StatusBanner";
import type { ApiError } from "@/types";

export function describeError(error: ApiError): { message: string; tone: StatusTone; icon: "clock" | "warning" | "offline" } {
  switch (error.errorCode) {
    case "rate_limited":
      return { message: "API rate limit reached, retrying safely...", tone: "warning", icon: "clock" };
    case "market_closed":
      return { message: "Market is currently closed", tone: "muted", icon: "clock" };
    case "data_delayed":
      return { message: "Data source is delayed", tone: "info", icon: "clock" };
    case "network_error":
      return { message: "Network issue reaching the data source. Retrying...", tone: "error", icon: "offline" };
    case "invalid_symbol":
      return { message: "We couldn't find data for that symbol. Try another asset.", tone: "error", icon: "warning" };
    case "missing_api_key":
      return { message: "A required data source API key is missing on the server.", tone: "error", icon: "warning" };
    case "unsupported_asset_type":
      return { message: "This asset type isn't supported yet.", tone: "warning", icon: "warning" };
    default:
      return { message: error.message || "Something went wrong fetching market data.", tone: "error", icon: "warning" };
  }
}
