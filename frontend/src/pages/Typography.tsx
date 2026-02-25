/*
 * pages/Typography.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Typography showcase page that renders every MUI text variant
 *           (h1–h6, subtitle, body, caption, overline) in a labelled list.
 *           Used as a design-system reference for the template.
 *
 * Relationships
 *   No Redux state — purely static / presentational.
 *
 * Key local constant
 *   variants – array of { variant, label, text } objects covering all MUI
 *              Typography variants
 */
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';

type TypographyVariant =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'subtitle1' | 'subtitle2'
  | 'body1' | 'body2'
  | 'caption' | 'overline';

const variants: { variant: TypographyVariant; label: string; text: string }[] = [
  { variant: 'h1',        label: 'h1',        text: 'The quick brown fox' },
  { variant: 'h2',        label: 'h2',        text: 'The quick brown fox' },
  { variant: 'h3',        label: 'h3',        text: 'The quick brown fox' },
  { variant: 'h4',        label: 'h4',        text: 'The quick brown fox' },
  { variant: 'h5',        label: 'h5',        text: 'The quick brown fox' },
  { variant: 'h6',        label: 'h6',        text: 'The quick brown fox' },
  { variant: 'subtitle1', label: 'subtitle1', text: 'The quick brown fox jumps over the lazy dog' },
  { variant: 'subtitle2', label: 'subtitle2', text: 'The quick brown fox jumps over the lazy dog' },
  {
    variant: 'body1',
    label: 'body1',
    text: 'The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs.',
  },
  {
    variant: 'body2',
    label: 'body2',
    text: 'The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs.',
  },
  { variant: 'caption',  label: 'caption',  text: 'Caption — used for images, tables, footnotes' },
  { variant: 'overline', label: 'overline', text: 'OVERLINE TEXT' },
];

export default function TypographyPage() {
  return (
    <Box>
      <MuiTypography variant="h4" fontWeight={700} gutterBottom>
        Typography
      </MuiTypography>

      <Paper sx={{ p: 3 }}>
        {variants.map(({ variant, label, text }, i) => (
          <Box key={variant}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 2,
                py: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <MuiTypography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 90, fontFamily: 'monospace' }}
              >
                {label}
              </MuiTypography>
              <MuiTypography variant={variant}>{text}</MuiTypography>
            </Box>
            {i < variants.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
