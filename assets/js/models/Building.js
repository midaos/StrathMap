export default class Building {
  constructor(
    buildingId,
    buildingName,
    buildingCode,
    description,
    latitude = null,
    longitude = null
  ) {
    this.buildingId = buildingId;
    this.buildingName = buildingName;
    this.buildingCode = buildingCode;
    this.description = description;
    this.latitude = latitude;
    this.longitude = longitude;
  }
}
