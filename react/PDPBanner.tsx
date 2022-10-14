import React, { useEffect, useMemo, useRef, useState } from "react";
import { canUseDOM } from "vtex.render-runtime";

import styles from "./styles.css";

interface PDPBannerProps {
  banners: Array<BannerObject>
}

interface BannerObject {
  match: MatchObject
  date?: DateObject
  text: TextObject
  image: string
  link: string
  blockClass: string
}

interface MatchObject {
  matchType: BannerType
  list: Array<TermObject>
}

interface TermObject {
  __editorItemTitle: string;
}

interface TextObject {
  title: string
  subtitle: string
}

interface DateObject {
  from: string
  to: string
}

enum BannerType {
  url = "url",
  spec = "spec"
}

interface BannerInfo {
  active: Boolean
  image?: string
  title?: string
  subtitle?: string
  link?: string
  blockClass?: string
}

const blankBanner: BannerInfo = { active: false, image: "", title: "", subtitle: "", link: "", blockClass: "" };
const specClassPrefix = "eriksbikeshop-product-attribute-0-x-productAttributeWrapper--";
const defaultBlockClass = "standard";

const PDPBanner: StorefrontFunctionComponent<PDPBannerProps> = ({ banners }) => {
  const openGate = useRef(true);
  const breakLoop = useRef(false);
  const userPath = useRef("");

  const [bannerInfo, setBannerInfo] = useState<BannerInfo>(blankBanner);

  // Component Did Mount. - LM
  useEffect(() => {
    if (!canUseDOM) return;
    if (!openGate.current) return;
    openGate.current = false;

    userPath.current = window.location.href.split(".com/")[1];
    console.info(banners);

    searchBanners();
  });

  // There is no listener for a URL path change at the moment,
  // so a polling method is required. I don't like it either. - LM
  useEffect(() => {
    const pollURL = setInterval(() => {
      const comparePath = userPath.current;
      const possibleNewPath = window.location.href.split(".com/")[1];

      if (possibleNewPath !== comparePath) pageReset(possibleNewPath);
    }, 1000);

    return () => clearInterval(pollURL);
  });

  // Reset page for next search. - LM
  const pageReset = (possibleNewPath: string) => {
    setBannerInfo(blankBanner);
    userPath.current = possibleNewPath;
    breakLoop.current = false;
    searchBanners();
  }

  // Search { banners } and call appropriate match function for each item. - LM
  const searchBanners = () => {
    for (let index = 0; index < banners.length; index++) {
      if (breakLoop.current) break;

      const tempType = banners[index].match.matchType;

      if (tempType === "url") urlMatch(index);
      if (tempType === "spec") specMatch(index);
    }
  }

  // Search provided { banner } item url parameter. - LM
  const urlMatch = (index: number) => {
    const windowPath: string = window.location.href.split(".com/")[1].toLowerCase();
    const termList = banners[index].match.list;

    let breakTermListLoop = false;
    for (let i = 0; i < termList.length; i++) {
      if (breakTermListLoop) break;
      const item = termList[i].__editorItemTitle;

      const matchFound = windowPath.includes(item.toLowerCase());

      if (matchFound) {
        breakTermListLoop = true;
        breakLoop.current = true;
        checkDate(index);
      }
    }
  }

  // Searches current page for a matched spec. - LM
  const specMatch = (index: number) => {
    if (!canUseDOM) return;
    const termList = banners[index].match.list;

    let breakTermListLoop = false;

    for (let i = 0; i < termList.length; i++) {
      if (breakTermListLoop) break;

      const item = termList[i].__editorItemTitle.split(", ");
      const spec = item[0];
      const condition = item[1];

      const matchClass: Element = document.getElementsByClassName(`${specClassPrefix}${spec}`)[0];
      if (!matchClass) continue;

      const bannerCondition = condition.toLowerCase();
      const classCondition = matchClass.children[0].textContent?.toLowerCase();

      const matchFound = classCondition === bannerCondition;

      if (matchFound) {
        breakTermListLoop = true;
        breakLoop.current = true;
        checkDate(index);
      }
    }
  }

  // Checks to see if a provided date range exists, and if the current
  // date falls within that range. Last step before activation. - LM
  const checkDate = (index: number) => {
    const validDate = banners[index].date;

    if (validDate) {
      // Has Date Range Object.
      const now = Date.now();
      const startDate = Date.parse(validDate.from);
      const endDate = Date.parse(validDate.to);

      if (startDate > now) return; // Not yet active.
      if (endDate < now) return; // Expired.

      activateBanner(index);
    } else {
      // No Date Range Provided.
      activateBanner(index);
    }
  }

  // Renders found banner item on page. - LM
  const activateBanner = (index: number) => {
    const b: BannerObject = banners[index];

    const image = b.image || "";
    const title = b.text ? b.text.title : "";
    const subtitle = b.text ? b.text.subtitle : "";
    const link = b.link || "";
    const blockClass = b.blockClass || defaultBlockClass;

    const tempBannerInfo: BannerInfo = {
      active: true,
      image,
      title,
      subtitle,
      link,
      blockClass
    }

    setBannerInfo(tempBannerInfo);
  }

  const BannerWrapper = () => (
    <div className={`${styles.wrapper}--${bannerInfo.blockClass}`}>
      {bannerInfo.image &&
        <div className={`${styles.imageContainer}--${bannerInfo.blockClass}`}>
          <img src={bannerInfo.image} className={`${styles.image}--${bannerInfo.blockClass}`} />
        </div>
      }
      {bannerInfo.title &&
        <div style={!bannerInfo.image ? { width: "100%" } : {}} className={`${styles.textContainer}--${bannerInfo.blockClass}`}>
          <div className={`${styles.title}--${bannerInfo.blockClass}`}>{bannerInfo.title}</div>
          {
            bannerInfo.subtitle &&
            <div className={`${styles.subtitle}--${bannerInfo.blockClass}`}>{bannerInfo.subtitle}</div>
          }
        </div>
      }
    </div>
  )

  const BannerWrapperWithLink = () => (
    <a href={bannerInfo.link} target="_blank" rel="noreferrer" className={`${styles.link}--${bannerInfo.blockClass} ${styles.link}`}><BannerWrapper /></a>
  )

  if (bannerInfo.active) {
    return (
      <div className={`${styles.container}--${bannerInfo.blockClass}`}>
        {bannerInfo.link ? <BannerWrapperWithLink /> : <BannerWrapper />}
      </div>
    )
  } else {
    return (<></>);
  }
}

PDPBanner.schema = {
  title: "PDP Banner",
  type: "object",
  properties: {
    banners: {
      type: "array",
      title: "Banners",
      description: "App terminates when the first match is found. Banners should be in order of priority.",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Site Editor Banner Title",
            type: "string"
          },
          text: {
            type: "object",
            properties: {
              title: {
                type: "string",
                title: "Title"
              },
              subtitle: {
                type: "string",
                title: "Subtitle"
              }
            }
          },
          image: {
            title: "Image Source",
            description: "OPTIONAL | Absolute Path to Image",
            type: "string"
          },
          link: {
            title: "Link",
            description: "OPTIONAL | Absolute or Relative Path to URL",
            type: "string"
          },
          blockClass: {
            title: "Block Class",
            description: "Style of banner. Contact Web Developer for new styles.",
            type: "string",
            enum: ["standard", "return", "boot-love", "image-only"]
          },
          date: {
            type: "object",
            properties: {
              from: {
                title: "Start Date",
                description: "OPTIONAL | Banner begins at midnight on this date.",
                type: "string"
              },
              to: {
                title: "End Date",
                description: "OPTIONAL | Banner ends at midnight on this date. Banner does not display at all during this day.",
                type: "string"
              }
            }
          },
          match: {
            type: "object",
            properties: {
              matchType: {
                title: "Match Type",
                enum: ["url", "spec"],
                type: "string"
              },
              list: {
                title: "Match List",
                type: "array",
                items: {
                  properties: {
                    __editorItemTitle: {
                      title: "Term",
                      type: "string",
                      description: "URL: String. Spec: String, Condition"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export default PDPBanner;