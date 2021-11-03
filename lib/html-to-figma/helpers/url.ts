export const getUrl = (url: string) => {
  if (!url) {
    return "";
  }
  let final = url.trim();
  if (final.startsWith("//")) {
    final = "https:" + final;
  }

  if (final.startsWith("/")) {
    final = "https://" + location.host + final;
  }

  return final;
};
