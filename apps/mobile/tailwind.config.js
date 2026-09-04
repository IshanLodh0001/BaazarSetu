/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F6F2EA",
        surface: "#FFFCF7",

        primary: {
          DEFAULT: "#304238",
          dark: "#26352D",
        },

        secondary: "#806A52",

        accent: {
          DEFAULT: "#C86643",
        },

        gold: "#C49A55",

        text: "#252923",
        muted: "#74766D",
        border: "#E5DED2",

        success: "#52745A",
        error: "#B65345",
      },
      fontFamily: {
        heading: ["Newsreader_500Medium"],
        headingRegular: ["Newsreader_400Regular"],
        headingSemiBold: ["Newsreader_600SemiBold"],

        sans: ["Inter_400Regular"],
        sansMedium: ["Inter_500Medium"],
        sansSemiBold: ["Inter_600SemiBold"],
        sansBold: ["Inter_700Bold"],

        mono: ["JetBrainsMono_400Regular"],
        monoMedium: ["JetBrainsMono_500Medium"],
        monoSemiBold: ["JetBrainsMono_600SemiBold"],
        monoBold: ["JetBrainsMono_700Bold"],
      },
      fontSize: {
        display: ["44px", { lineHeight: "48px" }],
        h1: ["32px", { lineHeight: "38px" }],
        h2: ["26px", { lineHeight: "32px" }],
        h3: ["22px", { lineHeight: "28px" }],

        "body-lg": ["17px", { lineHeight: "26px" }],
        body: ["16px", { lineHeight: "24px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],

        label: ["12px", { lineHeight: "16px" }],
        data: ["12px", { lineHeight: "16px" }],
      },

      borderRadius: {
        "2.5xl": "20px",
      },
    },
  },
  plugins: [],
};
