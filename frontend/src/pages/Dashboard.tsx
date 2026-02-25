/*
 * pages/Dashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Main dashboard overview page. Displays four KPI stat cards
 *           (users, revenue, orders, growth) and a weekly visits bar chart.
 *
 * Relationships
 *   Library : recharts (BarChart)
 *   No Redux state — all data is static mock data defined in this file.
 *
 * Key local constants
 *   stats    – array of 4 KPI objects { title, value, icon, change, positive }
 *   weekData – array of 7 daily visit counts { day, visits }
 */
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const stats = [
  { title: 'Total Users',  value: '1,284', icon: <PeopleIcon />,        change: '+12%', positive: true },
  { title: 'Revenue',      value: '$24,500', icon: <AttachMoneyIcon />,  change: '+8%',  positive: true },
  { title: 'Orders',       value: '340',   icon: <ShoppingCartIcon />,   change: '-3%',  positive: false },
  { title: 'Growth',       value: '18.6%', icon: <TrendingUpIcon />,     change: '+2%',  positive: true },
];

const weekData = [
  { day: 'Mon', visits: 120 },
  { day: 'Tue', visits: 200 },
  { day: 'Wed', visits: 150 },
  { day: 'Thu', visits: 280 },
  { day: 'Fri', visits: 310 },
  { day: 'Sat', visits: 190 },
  { day: 'Sun', visits: 95  },
];

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={stat.positive ? 'success.main' : 'error.main'}
                  >
                    {stat.change} from last month
                  </Typography>
                </Box>
                <Box sx={{ color: 'primary.main', opacity: 0.8, mt: 0.5 }}>
                  {stat.icon}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Weekly Visits
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visits" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
