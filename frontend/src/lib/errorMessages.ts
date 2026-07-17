import type { StatusTone } from "@/components/StatusBanner";
import type { ApiError } from "@/types";

export function describeError(error: ApiError): { message: string; tone: StatusTone; icon: "clock" | "warning" | "offline" } {
  switch (error.errorCode) {
    case "rate_limited":
      return { message: "Market data is temporarily refreshing. Showing the latest available figures.", tone: "warning", icon: "clock" };
    case "market_closed":
      return { message: "This market is currently closed. Showing the last available price.", tone: "muted", icon: "clock" };
    case "data_delayed":
      return { message: "This data may be a few minutes behind the live market.", tone: "info", icon: "clock" };
    case "network_error":
      return { message: "Having trouble reaching live market data. Retrying automatically...", tone: "error", icon: "offline" };
    case "invalid_symbol":
      return { message: "We couldn't find data for that symbol. Try another asset.", tone: "error", icon: "warning" };
    case "missing_api_key":
      return { message: "This feature isn't fully configured yet. Please check back later.", tone: "error", icon: "warning" };
    case "unsupported_asset_type":
      return { message: "This asset type isn't supported yet.", tone: "warning", icon: "warning" };
    default:
      return { message: error.message || "We couldn't load market data right now. Please try again in a moment.", tone: "error", icon: "warning" };
  }
}
