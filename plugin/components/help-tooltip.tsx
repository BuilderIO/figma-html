import Tooltip, { TooltipProps } from "@material-ui/core/Tooltip";
import { HelpOutline } from "@material-ui/icons";
import * as React from "react";
import { theme } from "../constants/theme";

const omit = (obj: any, keys: string[]) => {
  const result: any = {};
  for (const key in obj) {
    if (keys.indexOf(key) === -1) {
      result[key] = obj[key];
    }
  }
  return result;
};

export function HelpTooltip(
  props: React.PropsWithChildren<Omit<TooltipProps, "title">>
) {
  return (
    <Tooltip
      className="help-tooltip"
      {...omit(props, ["style"])}
      title={<div style={{ fontSize: 12 }}>{props.children}</div>}
    >
      <HelpOutline
        style={{
          fontSize: 14,
          verticalAlign: "middle",
          marginLeft: 3,
          marginTop: -1,
          color: theme.colors.primary,
          ...props.style,
        }}
      />
    </Tooltip>
  );
}
