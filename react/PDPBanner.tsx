import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, canUseDOM } from "vtex.render-runtime";
// @ts-ignore
import { useProduct } from 'vtex.product-context';

import styles from "./styles.css";

const blockClassList = {
  values: ["bigBluePromo", "textOnly", "leftImage", "rightImage"],
  labels: ["Big Blue Promo", "Text Only", "Text Right, Image Left", "Text Left, Image Right"]
};

interface PDPBannerProps {
  parentListBanners: [ParentListBanner]
  specBanners: [SpecBanner]
  urlBanners: [URLBanner]
}

interface ParentListBanner {
  __editorItemTitle: string
  parentList: string
  text: BannerTextObject
  image: string
  link: string
  blockClass: string
  startDate: string
  endDate: string
}

interface SpecBanner {
  __editorItemTitle: string
  matchSpec: SpecMatchObject
  text: BannerTextObject
  image: string
  link: string
  blockClass: string
  startDate: string
  endDate: string
}

interface URLBanner {
  __editorItemTitle: string
  matchList: [URLMatchObject]
  text: BannerTextObject
  image: string
  link: string
  blockClass: string
  startDate: string
  endDate: string
}

interface SpecMatchObject {
  spec: string
  value: string
  index: number
}

interface URLMatchObject {
  __editorItemTitle: string
}

interface BannerTextObject {
  title: string,
  subtitle: string,
  disclaimer: string
}

interface BannerInfo {
  active: Boolean
  image?: string
  title?: string
  subtitle?: string
  disclaimer?: string
  link?: string
  blockClass?: string
}

interface VTEXProperty {
  name: string
  values: Array<string>
}

interface SpecObject {
  name?: string
  value?: string
}

const blankBanner: BannerInfo = { active: false, image: "", title: "", subtitle: "", link: "", blockClass: "" };

const PDPBanner: StorefrontFunctionComponent<PDPBannerProps> = ({ parentListBanners, specBanners, urlBanners }) => {
  const productContextValue = useProduct();

  // Ref
  const openGate = useRef(true);
  const breakSearchLoop = useRef(false);

  const [bannerInfo, setBannerInfo] = useState<BannerInfo>(blankBanner);

  // Component Did Mount. - LM
  useEffect(() => {
    if (!openGate.current) return;
    openGate.current = false;

    // runBanner();
    // console.info(productContextValue.product.properties);
    { parentListBanners }
    { specBanners }
    { urlBanners }
  });

  useEffect(() => {
    if (!canUseDOM) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });

  const handleMessage = (e: MessageEvent) => {
    // Run on navigate
    const eventName = e.data.eventName;
    if (eventName === "vtex:productView") runBanner();
  }

  const runBanner = () => {
    pageReset();

    runParentListBanner();

    if (!breakSearchLoop.current) runSpecBanner();

    if (!breakSearchLoop.current) runURLBaner();
  }

  const runParentListBanner = () => {
    const productParentId = productContextValue.product.productReference;
    const currentBanners = parentListBanners.filter(banner => checkBannerDates(banner));

    const allParentLists = currentBanners.map(banner => {
      return banner.parentList;
    });

    for (let parentListIndex = 0; parentListIndex < currentBanners.length; parentListIndex++) {
      if (breakSearchLoop.current) break;

      const productParentIdFound = allParentLists[parentListIndex].includes(productParentId);
      if (productParentIdFound) {
        breakSearchLoop.current = true;
        buildBanner(parentListBanners[parentListIndex]);
      }
    }
  }

  const runSpecBanner = () => {
    const allSpecsFromBanners = buildBannerSpecList();
    const pagePropertiesThatMatchSpecsFromBanners = searchPageProperties(allSpecsFromBanners);

    if (pagePropertiesThatMatchSpecsFromBanners.length) {
      for (let propertyIndex = 0; propertyIndex < pagePropertiesThatMatchSpecsFromBanners.length; propertyIndex++) {
        if (breakSearchLoop.current) break;

        const propertySpec = pagePropertiesThatMatchSpecsFromBanners[propertyIndex].name?.toLowerCase();
        const propertyValue = pagePropertiesThatMatchSpecsFromBanners[propertyIndex].value?.toLowerCase();

        const matchedBannerIndex = specBanners.findIndex((item) => {
          const bannerSpec = item.matchSpec.spec?.toLowerCase();
          const bannerValue = item.matchSpec.value?.toLowerCase();

          const specMatch = propertySpec === bannerSpec;
          const valueMatch = propertyValue === bannerValue;

          return (specMatch && valueMatch) ? true : false;
        });

        if (matchedBannerIndex > -1) {
          breakSearchLoop.current = true;
          buildBanner(specBanners[matchedBannerIndex]);
        }
      }
    }
  }

  const runURLBaner = () => {
    if (!canUseDOM) return;

    const userPath = window.location.pathname.toLowerCase();

    for (let bannerIndex = 0; bannerIndex < urlBanners.length; bannerIndex++) {
      if (breakSearchLoop.current) break;

      const matchList = urlBanners[bannerIndex].matchList;

      for (let matchIndex = 0; matchIndex < matchList.length; matchIndex++) {
        if (breakSearchLoop.current) break;

        const term = matchList[matchIndex].__editorItemTitle;
        const matchFound = userPath.includes(term.toLowerCase());
        if (matchFound) {
          breakSearchLoop.current = true;
          buildBanner(urlBanners[bannerIndex])
        }
      }
    }
  }

  const checkBannerDates = (banner: ParentListBanner | SpecBanner | URLBanner) => {
    if (!banner.startDate && !banner.endDate) return true;

    const rightNow = Date.now();

    const startDate = new Date(banner.startDate).getTime();
    if (rightNow < startDate) return false;

    const endDate = new Date(banner.endDate).getTime();
    if (rightNow > endDate) return false;

    return true;
  }

  const buildBannerSpecList = () => {
    const currentBanners = specBanners.filter(banner => checkBannerDates(banner));
    const bannerSpecList: Array<string> = [];

    currentBanners.forEach(banner => {
      bannerSpecList.push(banner.matchSpec.spec.toLowerCase());
    });

    return bannerSpecList;
  }

  const searchPageProperties = (specList: Array<string>) => {
    const properties: Array<VTEXProperty> = productContextValue.product.properties;
    const foundSpecs: Array<SpecObject> = [];

    specList.forEach(spec => {
      const filter = properties.filter((word) => word.name.toLowerCase() === spec);
      if (filter.length) {
        foundSpecs.push({ name: filter[0].name.toLowerCase(), value: filter[0].values[0].toLowerCase() });
      }
    });
    console.info({ properties });
    return foundSpecs;
  }

  // Reset page for next search. - LM
  const pageReset = () => {
    setBannerInfo(blankBanner);
    breakSearchLoop.current = false;
  }

  const buildBanner = (banner: ParentListBanner | SpecBanner | URLBanner) => {
    const bannerData = {
      active: true,
      image: banner.image ?? "",
      title: banner.text.title ?? "",
      subtitle: banner.text.subtitle ?? "",
      disclaimer: banner.text.disclaimer ?? "",
      link: banner.link ?? "",
      blockClass: banner.blockClass ?? ""
    };
    console.info(bannerData);
    setBannerInfo(bannerData);
  }

  const Banner = () => (
    <>
      {bannerInfo.blockClass === "bigBluePromo" &&
        <div data-blockclass="bigBluePromo">
          <div data-text-area>
            {bannerInfo.title && <div data-title>{bannerInfo.title}</div>}
            <div data-small-textbox>
              {bannerInfo.subtitle && <div data-subtitle>{bannerInfo.subtitle}</div>}
              {bannerInfo.disclaimer && <div data-disclaimer>{bannerInfo.disclaimer}</div>}
            </div>
          </div>
        </div>
      }
      {bannerInfo.blockClass === "rightImage" &&
        <div data-blockclass="rightImage">
          <div data-text-area>
            {bannerInfo.title && <div data-title>{bannerInfo.title}</div>}
            {bannerInfo.subtitle && <div data-subtitle>{bannerInfo.subtitle}</div>}
          </div>
          <img data-image src={bannerInfo.image} height={128} alt="" />
        </div>
      }
      {bannerInfo.blockClass === "leftImage" &&
        <div data-blockclass="leftImage">
          <img data-image src={bannerInfo.image} height={128} alt="" />
          <div data-text-area>
            {bannerInfo.title && <div data-title>{bannerInfo.title}</div>}
            {bannerInfo.subtitle && <div data-subtitle>{bannerInfo.subtitle}</div>}
          </div>
        </div>
      }
      {bannerInfo.blockClass === "textOnly" &&
        <div data-blockclass="textOnly">
          <div data-text-area>
            {bannerInfo.title && <div data-title>{bannerInfo.title}</div>}
            {bannerInfo.subtitle && <div data-subtitle>{bannerInfo.subtitle}</div>}
          </div>
        </div>
      }
    </>
  );

  const LinkContainer = () => (
    <Link target="_blank" rel="noreferrer" data-link href={bannerInfo.link}><Banner /></Link>
  );

  return (
    <section aria-label="Related Informaiton Banner" className={styles.container}>
      {bannerInfo.link ? <LinkContainer /> : <Banner />}
    </section>
  )
}

PDPBanner.schema = {
  title: "PDP Banner",
  type: "object",
  properties: {
    parentListBanners: {
      type: "array",
      title: "Parent List Banners",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Site Editor Banner Title",
            type: "string"
          },
          parentList: {
            title: "Parent ID List",
            description: "Comma separated list",
            type: "string",
            widget: { "ui:widget": "textarea" },
          },
          text: {
            type: "object",
            properties: {
              title: {
                title: "Title",
                type: "string",
                widget: { "ui:widget": "textarea" }
              },
              subtitle: {
                title: "Subtitle",
                type: "string",
                widget: { "ui:widget": "textarea" }
              },
              disclaimer: {
                title: "Disclaimer Text",
                type: "string",
                widget: { "ui:widget": "textarea" }
              }
            }
          },
          image: {
            title: "Image",
            description: "OPTIONAL - Must be 128px height",
            type: "string",
            widget: { "ui:widget": "image-uploader" }
          },
          link: {
            title: "Link",
            description: "OPTIONAL | Absolute or Relative Path to URL",
            type: "string",
            widget: { "ui:widget": "textarea" }
          },
          blockClass: {
            title: "Display Style",
            description: "Style of banner. Contact Web Developer for new styles.",
            type: "string",
            enum: blockClassList.values,
            enumNames: blockClassList.labels,
          },
          startDate: {
            title: "Start at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          },
          endDate: {
            title: "End at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          }
        }
      }
    },
    specBanners: {
      type: "array",
      title: "Spec Match Banners",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Site Editor Banner Title",
            type: "string"
          },
          matchSpec: {
            type: "object",
            properties: {
              spec: {
                title: "Specification",
                description: "Case Sensitive",
                type: "string",
              },
              value: {
                title: "Value",
                description: "Case Sensitive",
                type: "string",
              }
            }
          },
          text: {
            type: "object",
            properties: {
              title: {
                title: "Title",
                type: "string",
                widget: { "ui:widget": "textarea" }
              },
              subtitle: {
                title: "Subtitle",
                type: "string",
                widget: { "ui:widget": "textarea" }
              }
            }
          },
          image: {
            title: "Image",
            description: "OPTIONAL - Must be 128px height",
            type: "string",
            widget: { "ui:widget": "image-uploader" }
          },
          link: {
            title: "Link",
            description: "OPTIONAL | Absolute or Relative Path to URL",
            type: "string",
            widget: { "ui:widget": "textarea" }
          },
          blockClass: {
            title: "Display Style",
            description: "Style of banner. Contact Web Developer for new styles.",
            type: "string",
            enum: blockClassList.values,
            enumNames: blockClassList.labels,
          },
          startDate: {
            title: "Start at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          },
          endDate: {
            title: "End at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          }
        }
      }
    },
    urlBanners: {
      type: "array",
      title: "URL Match Banners",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Site Editor Banner Title",
            type: "string"
          },
          matchList: {
            type: "array",
            items: {
              properties: {
                __editorItemTitle: {
                  title: "Match Term",
                  description: "No Spaes. Case Insensitive.",
                  type: "string"
                }
              }
            }
          },
          text: {
            type: "object",
            properties: {
              title: {
                title: "Title",
                type: "string",
                widget: { "ui:widget": "textarea" }
              },
              subtitle: {
                title: "Subtitle",
                type: "string",
                widget: { "ui:widget": "textarea" }
              }
            }
          },
          image: {
            title: "Image",
            description: "OPTIONAL - Must be 128px height",
            type: "string",
            widget: { "ui:widget": "image-uploader" }
          },
          link: {
            title: "Link",
            description: "OPTIONAL | Absolute or Relative Path to URL",
            type: "string",
            widget: { "ui:widget": "textarea" }
          },
          blockClass: {
            title: "Display Style",
            description: "Style of banner. Contact Web Developer for new styles.",
            type: "string",
            enum: blockClassList.values,
            enumNames: blockClassList.labels,
          },
          startDate: {
            title: "Start at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          },
          endDate: {
            title: "End at Midnight on this Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          }
        }
      }
    }
  }
}

export default PDPBanner;

