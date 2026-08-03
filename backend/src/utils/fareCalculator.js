/**
 * Calculate booking fare based on source, destination, schedule pricing, and number of seats
 * @param {Object} route - Route object with stops array
 * @param {Object} schedule - OnboardSchedule object with pricing
 * @param {String} source - Source location name
 * @param {String} destination - Destination location name
 * @param {Number} numberOfSeats - Number of seats being booked
 * @returns {Number} Calculated fare amount
 */
const calculateFare = (route, schedule, source, destination, numberOfSeats = 1) => {
  if (!route || !schedule || !source || !destination) {
    throw new Error('Route, schedule, source, and destination are required');
  }

  if (!schedule.pricing || !schedule.pricing.baseAmount || !schedule.pricing.perKmRate) {
    throw new Error('Schedule pricing information is missing');
  }

  // Find source and destination stop indices
  let sourceStopIndex = -1; // -1 indicates start point
  let destinationStopIndex = -1;

  // Check if source is the start point
  if (source.toLowerCase() === route.startPoint.toLowerCase()) {
    sourceStopIndex = -1;
  } else {
    // Find source in stops array
    if (route.stops && Array.isArray(route.stops)) {
      sourceStopIndex = route.stops.findIndex(
        stop => stop.name.toLowerCase() === source.toLowerCase()
      );
    }
    if (sourceStopIndex === -1) {
      throw new Error(`Source location "${source}" not found in route`);
    }
  }

  // Destination cannot be the start point (must be a stop)
  if (destination.toLowerCase() === route.startPoint.toLowerCase()) {
    throw new Error('Destination cannot be the starting point');
  }

  // Find destination in stops array
  if (route.stops && Array.isArray(route.stops)) {
    destinationStopIndex = route.stops.findIndex(
      stop => stop.name.toLowerCase() === destination.toLowerCase()
    );
  }

  if (destinationStopIndex === -1) {
    throw new Error(`Destination location "${destination}" not found in route`);
  }

  // Validate that destination comes after source
  if (sourceStopIndex !== -1 && destinationStopIndex <= sourceStopIndex) {
    throw new Error('Destination must come after source in the route');
  }

  // Calculate distance from source to destination
  let distance = 0;

  if (sourceStopIndex === -1) {
    // Source is start point, calculate distance from start to destination
    for (let i = 0; i <= destinationStopIndex && i < route.stops.length; i++) {
      if (route.stops[i].distanceFromPrev) {
        distance += route.stops[i].distanceFromPrev;
      }
    }
  } else {
    // Both are stops, calculate distance from source to destination
    for (let i = sourceStopIndex + 1; i <= destinationStopIndex && i < route.stops.length; i++) {
      if (route.stops[i].distanceFromPrev) {
        distance += route.stops[i].distanceFromPrev;
      }
    }
  }

  // Calculate fare: baseAmount + (distance * perKmRate) * numberOfSeats
  const baseAmount = schedule.pricing.baseAmount || 0;
  const perKmRate = schedule.pricing.perKmRate || 0;
  const farePerSeat = baseAmount + (distance * perKmRate);
  const totalFare = farePerSeat * numberOfSeats;

  // Round to 2 decimal places
  return Math.round(totalFare * 100) / 100;
};

module.exports = {
  calculateFare
};

