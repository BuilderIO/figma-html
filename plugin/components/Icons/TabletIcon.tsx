import { SvgIcon } from "@material-ui/core";
import { SvgIconProps } from "@material-ui/core/SvgIcon";
import * as React from "react";

export const TabletIcon = (props: SvgIconProps) => (
  <SvgIcon style={{ width: 12 }} viewBox="0 0 15 16">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 1.77778V14.2222H12.4444V1.77778H2ZM0 1.67901C0 0.751719 0.845684 0 1.88889 0H12.5556C13.5988 0 14.4444 0.751719 14.4444 1.67901V14.321C14.4444 15.2483 13.5988 16 12.5556 16H1.88889C0.845684 16 0 15.2483 0 14.321V1.67901Z"
    />
    <ellipse cx="7.5" cy="12" rx="1.5" ry="1.33333" />
  </SvgIcon>
);
