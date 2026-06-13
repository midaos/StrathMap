export default class Location {
  constructor(
    locationId,
    floorId,
    categoryId,
    nearestEntranceId,
    locationName,
    locationCode,
    description,
    isSearchable
  ) {
    this.locationId = locationId;
    this.floorId = floorId;
    this.categoryId = categoryId;
    this.nearestEntranceId = nearestEntranceId;
    this.locationName = locationName;
    this.locationCode = locationCode;
    this.description = description;
    this.isSearchable = isSearchable;
  }
}