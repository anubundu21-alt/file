/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#10243D',
    tint: '#19C88A',

    background: '#F5F7F4',
    foreground: '#10243D',

    card: '#FFFFFF',
    cardForeground: '#10243D',

    primary: '#19C88A',
    primaryForeground: '#ffffff',

    secondary: '#E8EEE9',
    secondaryForeground: '#10243D',

    muted: '#EEF2EF',
    mutedForeground: '#6C7A74',

    accent: '#E2F8EF',
    accentForeground: '#087B54',

    destructive: '#E25555',
    destructiveForeground: '#ffffff',

    border: '#DEE7E0',
    input: '#DEE7E0',
    navy: '#10243D',
    teal: '#19C88A',
    coral: '#F28A72',
    lavender: '#9B8AFB',
    sky: '#77B7F2',
    sunshine: '#F5C75D',
    inkSoft: '#41554D',
    white: '#FFFFFF',
  },
  dark: {
    text: '#F2F7F3',
    tint: '#47DFA8',
    background: '#0E1C2D',
    foreground: '#F2F7F3',
    card: '#172B40',
    cardForeground: '#F2F7F3',
    primary: '#47DFA8',
    primaryForeground: '#0E1C2D',
    secondary: '#20384D',
    secondaryForeground: '#F2F7F3',
    muted: '#1B3043',
    mutedForeground: '#9DB2A8',
    accent: '#163F35',
    accentForeground: '#6DE8BB',
    destructive: '#F07B7B',
    destructiveForeground: '#1C0F16',
    border: '#294356',
    input: '#294356',
    navy: '#0E1C2D',
    teal: '#47DFA8',
    coral: '#F59B83',
    lavender: '#B1A4FF',
    sky: '#86C4FA',
    sunshine: '#F7D777',
    inkSoft: '#C2D4C9',
    white: '#FFFFFF',
  },
  radius: 8,
};

export default colors;
