import RestaurantIcon from "@mui/icons-material/Restaurant";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TheatersIcon from "@mui/icons-material/Theaters";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FlightIcon from "@mui/icons-material/Flight";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

export const getIconForCategory = (category: string): React.ReactNode => {
  switch (category) {
    case "Food & Dining":
      return <RestaurantIcon />;
    case "Shopping":
      return <ShoppingCartIcon />;
    case "Transportation":
      return <DirectionsCarIcon />;
    case "Health & Fitness":
      return <FitnessCenterIcon />;
    case "Entertainment":
      return <TheatersIcon />;
    case "Utilities":
      return <ReceiptLongIcon />;
    case "Travel":
      return <FlightIcon />;
    case "Other":
    default:
      return <MoreHorizIcon />;
  }
};
