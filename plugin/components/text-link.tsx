import * as React from "react";
import { PropsWithChildren } from "react";
import { theme } from "../constants/theme";

export function TextLink(
  props: PropsWithChildren<
    React.DetailedHTMLProps<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  >
) {
  return (
    <a
      target="_blank"
      {...props}
      style={{ color: "blue", textDecoration: "underline", ...props.style }}
    />
  );
}

export function TooltipTextLink(
  props: PropsWithChildren<
    React.DetailedHTMLProps<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  >
) {
  return (
    <TextLink
      {...props}
      style={{
        color: theme.colors.primaryLight,
        ...props.style,
      }}
    />
  );
}
