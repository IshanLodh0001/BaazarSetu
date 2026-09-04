import { TextInput, View } from "react-native";

const Search = ({ setSearch, handleSearch, search }) => {
  return (
    <View>
      <TextInput
        className="h-14 w-full mt-6 rounded-md border border-border bg-surface
               px-4 font-sans text-body text-text"
        onChangeText={setSearch}
        onSubmitEditing={handleSearch}
        value={search}
        placeholder="Search products..."
        placeholderTextColor="#74766D"
        returnKeyType="search"
      />
    </View>
  );
};

export default Search;
