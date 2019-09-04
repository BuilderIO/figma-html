export const theme = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  },
  page: {
    tableMaxWidth: 900,
    formMaxWidth: 700
  },
  colors: {
    primary: "rgba(28, 151, 204, 1)",
    primaryDark: "rgb(8, 108, 193)",
    primaryLight: "rgb(7, 178, 215)",
    get primaryGradient() {
      return `linear-gradient(90deg, ${this.primary} 0px, ${this.primaryLight})`;
    },
    primaryWithOpacity(opacity: number) {
      return this.primary.replace("1)", opacity + ")");
    },
    green: "#00e676",
    // Aliases
    get success() {
      return this.green;
    },
    get secondary() {
      return this.green;
    }
  },
  fonts: {
    base: ""
  },
  studio: {
    tabs: {} as React.CSSProperties,
    container: {} as React.CSSProperties,
    sideBar: {} as React.CSSProperties
  },
  transitions: {
    easing: "cubic-bezier(.37,.01,0,.98)",

    for(...properties: string[]) {
      return properties.map(item => `${item} 0.3s ${this.easing}`).join(", ");
    }
  }
};
