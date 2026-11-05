export class Customer {
  constructor({ name, memberType, email, phone, preferredChannel, watchList = [] }) {
    this.name = name;
    this.memberType = memberType;
    this.email = email;
    this.phone = phone;
    this.preferredChannel = preferredChannel;
    this.watchList = [...watchList];
  }

  isWatching(productName) {
    return this.watchList.includes(productName);
  }
}
