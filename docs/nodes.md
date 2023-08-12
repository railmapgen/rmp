# Node Guide: Creating a miscellaneous node for Rail Map Painter

Nodes are similar to stations except the attributes should be `T` instead of `T extends StationAttributes`.

`NodeComponentProps<T>` also has a generic parameter `T` which you should replace it with your node attribute mentioned above.

Last, cities, canvas, and categories are not needed in the metadata.

[Station Guide: Creating a station for Rail Map Painter](./stations.md)
