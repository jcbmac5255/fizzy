class AddPositionToAccesses < ActiveRecord::Migration[8.2]
  def change
    add_column :accesses, :position, :integer
  end
end
